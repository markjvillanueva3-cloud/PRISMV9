/**
 * CAMAddInFrameworkEngine — E1125 (CAMX-MS11/U01)
 *
 * Reusable framework for generating CAM system add-ins/plugins that connect
 * to the PRISM MCP server. Produces ready-to-use source code templates for
 * HTTP client, UI panel, tool sync, and post-processor integration.
 *
 * Actions: cam_addin_generate, cam_addin_http_client, cam_addin_ui_panel,
 *          cam_addin_tool_sync, cam_addin_post_integration, cam_addin_list_systems
 *
 * Supported CAM systems:
 *   Mastercam (C#/.NET) | SolidCAM (VBA) | NX (Python) | hyperMILL (Python)
 *   Fusion 360 (Python) | PowerMill (PMILL macro) | CATIA (VBA)
 *
 * @version 1.0.0
 */

// ── Constants ─────────────────────────────────────────────────────────────────

const PRISM_HOST = "localhost";
const PRISM_PORT = 18361;
const PRISM_BASE_URL = `http://${PRISM_HOST}:${PRISM_PORT}`;

// ── Types ─────────────────────────────────────────────────────────────────────

export type CamSystem =
  | "mastercam"
  | "solidcam"
  | "nx"
  | "hypermill"
  | "fusion360"
  | "powermill"
  | "catia";

export type Language =
  | "python"
  | "csharp"
  | "vba"
  | "javascript";

export type FeatureType =
  | "http_client"
  | "ui_panel"
  | "tool_sync"
  | "post_integration";

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  description: string;
}

export interface AddInResult {
  cam_system: CamSystem;
  language: Language;
  features: FeatureType[];
  files: GeneratedFile[];
  install_instructions: string[];
  notes: string[];
}

export interface HTTPClientResult {
  language: Language;
  code: string;
  description: string;
}

export interface UIPanelResult {
  html: string;
  js: string;
  css: string;
  description: string;
}

export interface ToolSyncResult {
  cam_system: CamSystem;
  language: Language;
  code: string;
  description: string;
}

export interface PostIntegrationResult {
  cam_system: CamSystem;
  code: string;
  description: string;
}

export interface SupportedSystem {
  cam_system: CamSystem;
  display_name: string;
  primary_language: Language;
  alt_languages: Language[];
  plugin_type: string;
  api_reference: string;
  features_supported: FeatureType[];
  notes: string;
}

// ── Supported CAM systems registry ───────────────────────────────────────────

const SUPPORTED_SYSTEMS: SupportedSystem[] = [
  {
    cam_system: "mastercam",
    display_name: "Mastercam",
    primary_language: "csharp",
    alt_languages: [],
    plugin_type: "C# .NET Class Library (Add-In Manager)",
    api_reference: "Mastercam.Core.dll, Mastercam.Database.dll",
    features_supported: ["http_client", "ui_panel", "tool_sync", "post_integration"],
    notes: "Requires Mastercam 2021+ and .NET 4.8. Deploy to C:\\Program Files\\Mastercam\\addins\\",
  },
  {
    cam_system: "solidcam",
    display_name: "SolidCAM",
    primary_language: "vba",
    alt_languages: [],
    plugin_type: "VBA Macro + SolidWorks API",
    api_reference: "SolidCAM API, SolidWorks SLDWORKS API",
    features_supported: ["http_client", "tool_sync", "post_integration"],
    notes: "Macros run inside SolidWorks. VBA WinHTTP used for HTTP calls.",
  },
  {
    cam_system: "nx",
    display_name: "Siemens NX",
    primary_language: "python",
    alt_languages: [],
    plugin_type: "NX Open Python Journal/Script",
    api_reference: "NXOpen Python API (NXOpen module)",
    features_supported: ["http_client", "ui_panel", "tool_sync", "post_integration"],
    notes: "Requires NX 12+ with Python 3.x. Place scripts in UGII_USER_DIR.",
  },
  {
    cam_system: "hypermill",
    display_name: "hyperMILL",
    primary_language: "python",
    alt_languages: [],
    plugin_type: "hyperMILL API Python Script",
    api_reference: "hyperMILL COM API via win32com",
    features_supported: ["http_client", "ui_panel", "tool_sync", "post_integration"],
    notes: "Uses hyperMILL COM automation interface. Requires hyperMILL 2021+.",
  },
  {
    cam_system: "fusion360",
    display_name: "Autodesk Fusion 360",
    primary_language: "python",
    alt_languages: ["javascript"],
    plugin_type: "Fusion 360 Add-In (Python or JavaScript)",
    api_reference: "adsk.core, adsk.fusion, adsk.cam modules",
    features_supported: ["http_client", "ui_panel", "tool_sync", "post_integration"],
    notes: "Deploy to ~/AppData/Roaming/Autodesk/Autodesk Fusion 360/API/AddIns/",
  },
  {
    cam_system: "powermill",
    display_name: "Autodesk PowerMill",
    primary_language: "python",
    alt_languages: [],
    plugin_type: "PowerMill Macro + Python (via powermillapi)",
    api_reference: "powermillapi Python package",
    features_supported: ["http_client", "tool_sync", "post_integration"],
    notes: "Requires PowerMill 2021+ and powermillapi package.",
  },
  {
    cam_system: "catia",
    display_name: "CATIA V5/V6",
    primary_language: "vba",
    alt_languages: [],
    plugin_type: "CATIA CATScript / VBA Macro",
    api_reference: "CATIA Automation API (INFITF, MEC.MEC, MFG.MFG)",
    features_supported: ["http_client", "tool_sync", "post_integration"],
    notes: "Uses CATIA scripting environment. WinHTTP for HTTP calls.",
  },
];

// ── HTTP Client templates ─────────────────────────────────────────────────────

function generateHTTPClientPython(): string {
  return `#!/usr/bin/env python3
"""
PRISM MCP Server HTTP Client — Python
Connects to PRISM MCP server at ${PRISM_BASE_URL}
Generated by CAMAddInFrameworkEngine (E1125)
"""

import json
import time
import urllib.request
import urllib.error
from typing import Any, Dict, Optional

PRISM_URL = "${PRISM_BASE_URL}"
MAX_RETRIES = 3
RETRY_DELAY = 1.0  # seconds
TIMEOUT = 30       # seconds


class PRISMClient:
    """Lightweight PRISM MCP server HTTP client."""

    def __init__(self, base_url: str = PRISM_URL):
        self.base_url = base_url.rstrip("/")
        self._request_id = 0

    def _next_id(self) -> int:
        self._request_id += 1
        return self._request_id

    def health_check(self) -> bool:
        """Returns True if PRISM server is reachable."""
        try:
            req = urllib.request.Request(f"{self.base_url}/health")
            with urllib.request.urlopen(req, timeout=5) as resp:
                return resp.status == 200
        except Exception:
            return False

    def call_tool(
        self,
        tool_name: str,
        params: Dict[str, Any],
        retries: int = MAX_RETRIES,
    ) -> Dict[str, Any]:
        """
        Send a JSON-RPC tool call to PRISM MCP server.

        Args:
            tool_name: MCP tool name (e.g., 'prism_cam', 'prism_calc')
            params: Tool parameters dict
            retries: Number of retry attempts on failure

        Returns:
            Parsed response dict

        Raises:
            RuntimeError: If all retries exhausted
        """
        payload = json.dumps({
            "jsonrpc": "2.0",
            "id": self._next_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": params,
            },
        }).encode("utf-8")

        last_error: Optional[Exception] = None
        for attempt in range(retries + 1):
            try:
                req = urllib.request.Request(
                    f"{self.base_url}/mcp",
                    data=payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
                    body = resp.read().decode("utf-8")
                    data = json.loads(body)
                    if "error" in data:
                        raise RuntimeError(
                            f"PRISM error: {data['error'].get('message', data['error'])}"
                        )
                    return data.get("result", {})
            except urllib.error.URLError as e:
                last_error = e
                if attempt < retries:
                    time.sleep(RETRY_DELAY * (attempt + 1))
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Invalid JSON response: {e}") from e

        raise RuntimeError(f"PRISM call failed after {retries} retries: {last_error}")

    # ── Convenience wrappers ──────────────────────────────────────────────────

    def get_speed_feed(
        self,
        material: str,
        tool_diameter_mm: float,
        flute_count: int,
        operation: str = "milling",
    ) -> Dict[str, Any]:
        """Get optimized speed/feed from SpeedFeedOrchestrator."""
        return self.call_tool("prism_calc", {
            "action": "speed_feed_orchestrate",
            "params": {
                "material": material,
                "tool_diameter_mm": tool_diameter_mm,
                "flute_count": flute_count,
                "operation": operation,
            },
        })

    def recommend_strategy(
        self,
        cam_system: str,
        material: str,
        operation: str,
    ) -> Dict[str, Any]:
        """Get CAM strategy recommendation."""
        return self.call_tool("prism_cam", {
            "action": "cam_strategy_recommend",
            "params": {
                "cam_system": cam_system,
                "material": material,
                "operation": operation,
            },
        })

    def estimate_cost(
        self,
        operation_time_min: float,
        machine_rate_per_hr: float,
        material_cost: float = 0.0,
    ) -> Dict[str, Any]:
        """Get cost estimate."""
        return self.call_tool("prism_calc", {
            "action": "job_cost_estimate",
            "params": {
                "operation_time_min": operation_time_min,
                "machine_rate_per_hr": machine_rate_per_hr,
                "material_cost": material_cost,
            },
        })

    def optimize_gcode(
        self,
        gcode: str,
        material: str,
        tool_diameter_mm: float,
    ) -> Dict[str, Any]:
        """Send G-code for per-block S/F optimization via AutoSpeedFeedEngine."""
        return self.call_tool("prism_cam", {
            "action": "post_feed_optimize",
            "params": {
                "gcode": gcode,
                "material": material,
                "tool_diameter_mm": tool_diameter_mm,
            },
        })


# ── Example usage ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    client = PRISMClient()
    if not client.health_check():
        print("ERROR: PRISM server not reachable at", PRISM_URL)
        exit(1)

    result = client.get_speed_feed(
        material="6061",
        tool_diameter_mm=12.0,
        flute_count=4,
        operation="milling",
    )
    print("Speed/Feed:", json.dumps(result, indent=2))
`;
}

function generateHTTPClientCSharp(): string {
  return `// PRISM MCP Server HTTP Client — C# (.NET)
// Connects to PRISM MCP server at ${PRISM_BASE_URL}
// Generated by CAMAddInFrameworkEngine (E1125)
// Requires: System.Net.Http (included in .NET 4.5+)

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;  // NuGet: Newtonsoft.Json

namespace PRISMAddIn
{
    public class PRISMClient : IDisposable
    {
        private readonly HttpClient _http;
        private readonly string _baseUrl;
        private int _requestId;

        public const string DefaultUrl = "${PRISM_BASE_URL}";
        private const int MaxRetries = 3;
        private const int TimeoutSeconds = 30;

        public PRISMClient(string baseUrl = DefaultUrl)
        {
            _baseUrl = baseUrl.TrimEnd('/');
            _http = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(TimeoutSeconds)
            };
        }

        /// <summary>Returns true if PRISM server is reachable.</summary>
        public async Task<bool> HealthCheckAsync()
        {
            try
            {
                var resp = await _http.GetAsync($"{_baseUrl}/health").ConfigureAwait(false);
                return resp.IsSuccessStatusCode;
            }
            catch
            {
                return false;
            }
        }

        /// <summary>
        /// Send a JSON-RPC tool call to PRISM MCP server with retry.
        /// </summary>
        public async Task<Dictionary<string, object>> CallToolAsync(
            string toolName,
            Dictionary<string, object> parameters,
            CancellationToken ct = default)
        {
            var payload = JsonConvert.SerializeObject(new
            {
                jsonrpc = "2.0",
                id = Interlocked.Increment(ref _requestId),
                method = "tools/call",
                @params = new
                {
                    name = toolName,
                    arguments = parameters
                }
            });

            Exception lastEx = null;
            for (int attempt = 0; attempt <= MaxRetries; attempt++)
            {
                try
                {
                    var content = new StringContent(payload, Encoding.UTF8, "application/json");
                    var resp = await _http.PostAsync($"{_baseUrl}/mcp", content, ct).ConfigureAwait(false);
                    resp.EnsureSuccessStatusCode();

                    var body = await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
                    var data = JsonConvert.DeserializeObject<Dictionary<string, object>>(body);

                    if (data.ContainsKey("error"))
                        throw new Exception($"PRISM error: {data["error"]}");

                    return data.ContainsKey("result")
                        ? JsonConvert.DeserializeObject<Dictionary<string, object>>(data["result"].ToString())
                        : new Dictionary<string, object>();
                }
                catch (HttpRequestException ex)
                {
                    lastEx = ex;
                    if (attempt < MaxRetries)
                        await Task.Delay(TimeSpan.FromSeconds(attempt + 1), ct).ConfigureAwait(false);
                }
            }

            throw new Exception($"PRISM call failed after {MaxRetries} retries: {lastEx?.Message}");
        }

        // ── Convenience wrappers ──────────────────────────────────────────────

        public Task<Dictionary<string, object>> GetSpeedFeedAsync(
            string material, double toolDiameterMm, int fluteCount, string operation = "milling")
        {
            return CallToolAsync("prism_calc", new Dictionary<string, object>
            {
                ["action"] = "speed_feed_orchestrate",
                ["params"] = new Dictionary<string, object>
                {
                    ["material"] = material,
                    ["tool_diameter_mm"] = toolDiameterMm,
                    ["flute_count"] = fluteCount,
                    ["operation"] = operation,
                }
            });
        }

        public Task<Dictionary<string, object>> RecommendStrategyAsync(
            string camSystem, string material, string operation)
        {
            return CallToolAsync("prism_cam", new Dictionary<string, object>
            {
                ["action"] = "cam_strategy_recommend",
                ["params"] = new Dictionary<string, object>
                {
                    ["cam_system"] = camSystem,
                    ["material"] = material,
                    ["operation"] = operation,
                }
            });
        }

        public Task<Dictionary<string, object>> OptimizeGcodeAsync(
            string gcode, string material, double toolDiameterMm)
        {
            return CallToolAsync("prism_cam", new Dictionary<string, object>
            {
                ["action"] = "post_feed_optimize",
                ["params"] = new Dictionary<string, object>
                {
                    ["gcode"] = gcode,
                    ["material"] = material,
                    ["tool_diameter_mm"] = toolDiameterMm,
                }
            });
        }

        public void Dispose() => _http?.Dispose();
    }
}
`;
}

function generateHTTPClientVBA(): string {
  return `' PRISM MCP Server HTTP Client — VBA
' Connects to PRISM MCP server at ${PRISM_BASE_URL}
' Generated by CAMAddInFrameworkEngine (E1125)
' Requires: Microsoft WinHTTP Services 5.1 (reference: winhttp.dll)

Option Explicit

Const PRISM_URL As String = "${PRISM_BASE_URL}/mcp"
Const PRISM_HEALTH_URL As String = "${PRISM_BASE_URL}/health"
Const MAX_RETRIES As Integer = 3
Const TIMEOUT_MS As Long = 30000

Dim gRequestId As Long

' ── Core HTTP call ────────────────────────────────────────────────────────────

Public Function PRISMHealthCheck() As Boolean
    Dim http As Object
    On Error GoTo ErrHandler
    Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
    http.Open "GET", PRISM_HEALTH_URL, False
    http.SetTimeouts TIMEOUT_MS, TIMEOUT_MS, TIMEOUT_MS, TIMEOUT_MS
    http.Send
    PRISMHealthCheck = (http.Status = 200)
    Exit Function
ErrHandler:
    PRISMHealthCheck = False
End Function

Public Function PRISMCallTool(toolName As String, paramsJson As String) As String
    ' Returns raw JSON response string, or "ERROR:..." on failure
    Dim http As Object
    Dim payload As String
    Dim attempt As Integer
    Dim reqId As Long

    gRequestId = gRequestId + 1
    reqId = gRequestId

    payload = "{""jsonrpc"":""2.0"",""id"":" & reqId & _
              ",""method"":""tools/call"",""params"":{""name"":""" & toolName & _
              """,""arguments"":" & paramsJson & "}}"

    For attempt = 1 To MAX_RETRIES
        On Error GoTo RetryNext
        Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
        http.Open "POST", PRISM_URL, False
        http.SetTimeouts TIMEOUT_MS, TIMEOUT_MS, TIMEOUT_MS, TIMEOUT_MS
        http.SetRequestHeader "Content-Type", "application/json"
        http.Send payload

        If http.Status = 200 Then
            PRISMCallTool = http.ResponseText
            Exit Function
        End If
RetryNext:
        If attempt < MAX_RETRIES Then
            Application.Wait Now + TimeValue("00:00:01")
        End If
    Next attempt

    PRISMCallTool = "ERROR: PRISM call failed after " & MAX_RETRIES & " retries"
End Function

' ── Convenience wrappers ──────────────────────────────────────────────────────

Public Function PRISMGetSpeedFeed( _
    material As String, _
    toolDiamMm As Double, _
    fluteCount As Integer, _
    Optional operation As String = "milling") As String

    Dim p As String
    p = "{""action"":""speed_feed_orchestrate"",""params"":{" & _
        """material"":""" & material & """," & _
        """tool_diameter_mm"":" & toolDiamMm & "," & _
        """flute_count"":" & fluteCount & "," & _
        """operation"":""" & operation & """}}"
    PRISMGetSpeedFeed = PRISMCallTool("prism_calc", p)
End Function

Public Function PRISMRecommendStrategy( _
    camSystem As String, _
    material As String, _
    operation As String) As String

    Dim p As String
    p = "{""action"":""cam_strategy_recommend"",""params"":{" & _
        """cam_system"":""" & camSystem & """," & _
        """material"":""" & material & """," & _
        """operation"":""" & operation & """}}"
    PRISMRecommendStrategy = PRISMCallTool("prism_cam", p)
End Function

Public Function PRISMOptimizeGcode( _
    gcode As String, _
    material As String, _
    toolDiamMm As Double) As String

    ' Escape quotes in gcode for JSON embedding
    Dim escapedGcode As String
    escapedGcode = Replace(gcode, """", "\""")
    escapedGcode = Replace(escapedGcode, Chr(10), "\\n")
    escapedGcode = Replace(escapedGcode, Chr(13), "")

    Dim p As String
    p = "{""action"":""post_feed_optimize"",""params"":{" & _
        """gcode"":""" & escapedGcode & """," & _
        """material"":""" & material & """," & _
        """tool_diameter_mm"":" & toolDiamMm & "}}"
    PRISMOptimizeGcode = PRISMCallTool("prism_cam", p)
End Function
`;
}

function generateHTTPClientJavaScript(): string {
  return `/**
 * PRISM MCP Server HTTP Client — JavaScript (Fusion 360 / Node.js)
 * Connects to PRISM MCP server at ${PRISM_BASE_URL}
 * Generated by CAMAddInFrameworkEngine (E1125)
 *
 * For Fusion 360: uses adsk.core.HttpRequest (2024.1+) or XMLHttpRequest
 * For Node.js / browser: uses fetch API
 */

const PRISM_URL = "${PRISM_BASE_URL}";
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const TIMEOUT_MS = 30000;

let _requestId = 0;

/**
 * Check if PRISM server is reachable.
 * @returns {Promise<boolean>}
 */
async function prismHealthCheck() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch(\`\${PRISM_URL}/health\`, { signal: controller.signal });
    clearTimeout(timer);
    return resp.ok;
  } catch {
    return false;
  }
}

/**
 * Send a JSON-RPC tool call to PRISM MCP server.
 * @param {string} toolName - MCP tool name (e.g., 'prism_cam')
 * @param {object} params - Tool parameters
 * @param {number} [retries=MAX_RETRIES] - Retry attempts
 * @returns {Promise<object>} Response data
 */
async function prismCallTool(toolName, params, retries = MAX_RETRIES) {
  const id = ++_requestId;
  const payload = JSON.stringify({
    jsonrpc: "2.0",
    id,
    method: "tools/call",
    params: { name: toolName, arguments: params },
  });

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const resp = await fetch(\`\${PRISM_URL}/mcp\`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!resp.ok) throw new Error(\`HTTP \${resp.status}: \${resp.statusText}\`);

      const data = await resp.json();
      if (data.error) throw new Error(\`PRISM error: \${JSON.stringify(data.error)}\`);

      return data.result ?? {};
    } catch (err) {
      lastError = err;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw new Error(\`PRISM call failed after \${retries} retries: \${lastError?.message}\`);
}

// ── Convenience wrappers ──────────────────────────────────────────────────────

async function prismGetSpeedFeed(material, toolDiameterMm, fluteCount, operation = "milling") {
  return prismCallTool("prism_calc", {
    action: "speed_feed_orchestrate",
    params: { material, tool_diameter_mm: toolDiameterMm, flute_count: fluteCount, operation },
  });
}

async function prismRecommendStrategy(camSystem, material, operation) {
  return prismCallTool("prism_cam", {
    action: "cam_strategy_recommend",
    params: { cam_system: camSystem, material, operation },
  });
}

async function prismEstimateCost(operationTimeMin, machineRatePerHr, materialCost = 0) {
  return prismCallTool("prism_calc", {
    action: "job_cost_estimate",
    params: {
      operation_time_min: operationTimeMin,
      machine_rate_per_hr: machineRatePerHr,
      material_cost: materialCost,
    },
  });
}

async function prismOptimizeGcode(gcode, material, toolDiameterMm) {
  return prismCallTool("prism_cam", {
    action: "post_feed_optimize",
    params: { gcode, material, tool_diameter_mm: toolDiameterMm },
  });
}

// Export for Node.js / bundlers
if (typeof module !== "undefined") {
  module.exports = {
    prismHealthCheck, prismCallTool,
    prismGetSpeedFeed, prismRecommendStrategy,
    prismEstimateCost, prismOptimizeGcode,
  };
}
`;
}

// ── UI Panel template ─────────────────────────────────────────────────────────

function generateUIPanelHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PRISM CAM Integration Panel</title>
  <link rel="stylesheet" href="prism-panel.css">
</head>
<body>
  <div class="prism-panel">
    <header class="prism-header">
      <div class="prism-logo">PRISM</div>
      <div class="prism-status" id="status-indicator">
        <span class="status-dot" id="status-dot"></span>
        <span id="status-text">Connecting...</span>
      </div>
    </header>

    <!-- Material Selector (2,957 materials) -->
    <section class="prism-section">
      <h3>Material</h3>
      <div class="input-row">
        <input type="text" id="material-search" placeholder="Search 2,957 materials..." autocomplete="off">
        <div class="dropdown" id="material-dropdown"></div>
      </div>
      <div class="material-info" id="material-info"></div>
    </section>

    <!-- Tool Selector (95K tools) -->
    <section class="prism-section">
      <h3>Tool</h3>
      <div class="input-row">
        <input type="number" id="tool-diameter" placeholder="Diameter (mm)" min="0.1" max="500" step="0.1">
        <input type="number" id="flute-count" placeholder="Flutes" min="1" max="12" step="1" value="4">
        <select id="operation-type">
          <option value="milling">Milling</option>
          <option value="drilling">Drilling</option>
          <option value="turning">Turning</option>
          <option value="finishing">Finishing</option>
          <option value="roughing">Roughing</option>
        </select>
      </div>
      <div class="tool-search-row">
        <input type="text" id="tool-search" placeholder="Search 95K tools by name/manufacturer...">
        <div class="dropdown" id="tool-dropdown"></div>
      </div>
    </section>

    <!-- Speed/Feed Display -->
    <section class="prism-section prism-results" id="sf-section">
      <h3>Speed / Feed</h3>
      <div class="sf-grid">
        <div class="sf-card">
          <span class="sf-label">RPM</span>
          <span class="sf-value" id="sf-rpm">—</span>
        </div>
        <div class="sf-card">
          <span class="sf-label">Feed (mm/min)</span>
          <span class="sf-value" id="sf-feed">—</span>
        </div>
        <div class="sf-card">
          <span class="sf-label">Chip Load</span>
          <span class="sf-value" id="sf-chipload">—</span>
        </div>
        <div class="sf-card">
          <span class="sf-label">Tool Life</span>
          <span class="sf-value" id="sf-toollife">—</span>
        </div>
        <div class="sf-card">
          <span class="sf-label">Power (kW)</span>
          <span class="sf-value" id="sf-power">—</span>
        </div>
        <div class="sf-card">
          <span class="sf-label">Confidence</span>
          <span class="sf-value" id="sf-confidence">—</span>
        </div>
      </div>
      <div class="sf-warnings" id="sf-warnings"></div>
    </section>

    <!-- Strategy Recommendation -->
    <section class="prism-section" id="strategy-section">
      <h3>Strategy Recommendation</h3>
      <div class="strategy-card" id="strategy-display">
        <p class="placeholder-text">Enter material and tool to get recommendations.</p>
      </div>
    </section>

    <!-- Cost Estimate -->
    <section class="prism-section">
      <h3>Cost Estimate</h3>
      <div class="input-row">
        <input type="number" id="cycle-time" placeholder="Cycle time (min)" min="0" step="1">
        <input type="number" id="machine-rate" placeholder="Machine rate ($/hr)" min="0" step="5">
      </div>
      <div class="cost-display" id="cost-display">—</div>
    </section>

    <!-- Optimize Button -->
    <section class="prism-section prism-actions">
      <button class="btn-optimize" id="btn-optimize" disabled>
        <span class="btn-icon">&#9889;</span> Optimize with PRISM
      </button>
      <button class="btn-secondary" id="btn-reset">Reset</button>
    </section>

    <!-- Results -->
    <section class="prism-section prism-output" id="output-section" style="display:none">
      <h3>Optimization Result</h3>
      <pre id="output-content"></pre>
    </section>
  </div>
  <script src="prism-panel.js"></script>
</body>
</html>`;
}

function generateUIPanelJS(): string {
  return `/**
 * PRISM CAM Integration Panel — JavaScript
 * Generated by CAMAddInFrameworkEngine (E1125)
 *
 * Configure PRISM_URL and CAM_SYSTEM before deploying.
 */

const PRISM_URL = "${PRISM_BASE_URL}";
const CAM_SYSTEM = "generic"; // e.g., "mastercam", "fusion360", "nx"

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  connected: false,
  material: null,
  toolDiameter: null,
  fluteCount: 4,
  operation: "milling",
  sfResult: null,
  strategyResult: null,
  costResult: null,
};

// ── DOM helpers ───────────────────────────────────────────────────────────────

const $ = id => document.getElementById(id);

function setStatus(ok) {
  state.connected = ok;
  $("status-dot").className = "status-dot " + (ok ? "online" : "offline");
  $("status-text").textContent = ok ? "Connected" : "Disconnected";
  $("btn-optimize").disabled = !ok;
}

function showWarnings(warnings) {
  const el = $("sf-warnings");
  if (!warnings || warnings.length === 0) { el.innerHTML = ""; return; }
  el.innerHTML = warnings.map(w =>
    \`<div class="warning-item">&#9888; \${w}</div>\`
  ).join("");
}

function showStrategy(data) {
  if (!data) return;
  const el = $("strategy-display");
  const rec = data.recommendation || data;
  el.innerHTML = \`
    <div class="strategy-name">\${rec.strategy_name || rec.name || "—"}</div>
    <div class="strategy-desc">\${rec.description || rec.summary || ""}</div>
    \${rec.tips ? \`<ul>\${rec.tips.map(t => \`<li>\${t}</li>\`).join("")}</ul>\` : ""}
  \`;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function healthCheck() {
  try {
    const resp = await fetch(\`\${PRISM_URL}/health\`, { signal: AbortSignal.timeout(5000) });
    setStatus(resp.ok);
  } catch {
    setStatus(false);
  }
}

async function fetchSpeedFeed() {
  if (!state.material || !state.toolDiameter) return;
  try {
    const resp = await fetch(\`\${PRISM_URL}/mcp\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "tools/call",
        params: {
          name: "prism_calc",
          arguments: {
            action: "speed_feed_orchestrate",
            params: {
              material: state.material,
              tool_diameter_mm: state.toolDiameter,
              flute_count: state.fluteCount,
              operation: state.operation,
            },
          },
        },
      }),
    });
    const data = await resp.json();
    const r = data?.result?.content?.[0]
      ? JSON.parse(data.result.content[0].text)
      : data?.result;
    if (!r) return;
    state.sfResult = r;
    $("sf-rpm").textContent = r.rpm ?? r.spindle_rpm ?? "—";
    $("sf-feed").textContent = r.feedRate_mmMin ?? r.feed_mm_min ?? "—";
    $("sf-chipload").textContent = r.chipLoad_mm ?? r.chip_load_mm ?? "—";
    $("sf-toollife").textContent = r.toolLife_min != null ? r.toolLife_min + " min" : "—";
    $("sf-power").textContent = r.power_kW ?? "—";
    $("sf-confidence").textContent = r.confidence != null
      ? Math.round(r.confidence * 100) + "%" : "—";
    showWarnings(r.warnings);
    $("sf-section").classList.add("has-data");
  } catch (e) {
    console.error("Speed/feed error:", e);
  }
}

async function fetchStrategy() {
  if (!state.material) return;
  try {
    const resp = await fetch(\`\${PRISM_URL}/mcp\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 2, method: "tools/call",
        params: {
          name: "prism_cam",
          arguments: {
            action: "cam_strategy_recommend",
            params: {
              cam_system: CAM_SYSTEM,
              material: state.material,
              operation: state.operation,
            },
          },
        },
      }),
    });
    const data = await resp.json();
    const r = data?.result?.content?.[0]
      ? JSON.parse(data.result.content[0].text)
      : data?.result;
    state.strategyResult = r;
    showStrategy(r);
  } catch (e) {
    console.error("Strategy error:", e);
  }
}

async function fetchCostEstimate() {
  const cycleTime = parseFloat($("cycle-time").value);
  const machineRate = parseFloat($("machine-rate").value);
  if (isNaN(cycleTime) || isNaN(machineRate)) return;
  try {
    const resp = await fetch(\`\${PRISM_URL}/mcp\`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 3, method: "tools/call",
        params: {
          name: "prism_calc",
          arguments: {
            action: "job_cost_estimate",
            params: { operation_time_min: cycleTime, machine_rate_per_hr: machineRate },
          },
        },
      }),
    });
    const data = await resp.json();
    const r = data?.result?.content?.[0]
      ? JSON.parse(data.result.content[0].text)
      : data?.result;
    const cost = r?.total_cost ?? r?.cost ?? r?.estimate;
    $("cost-display").textContent = cost != null
      ? "$" + Number(cost).toFixed(2) : "—";
  } catch (e) {
    console.error("Cost error:", e);
  }
}

async function runOptimize() {
  $("btn-optimize").disabled = true;
  $("btn-optimize").textContent = "Optimizing...";
  await Promise.all([fetchSpeedFeed(), fetchStrategy(), fetchCostEstimate()]);
  const result = {
    material: state.material,
    tool_diameter_mm: state.toolDiameter,
    flute_count: state.fluteCount,
    operation: state.operation,
    speed_feed: state.sfResult,
    strategy: state.strategyResult,
    timestamp: new Date().toISOString(),
  };
  $("output-content").textContent = JSON.stringify(result, null, 2);
  $("output-section").style.display = "";
  $("btn-optimize").disabled = false;
  $("btn-optimize").innerHTML = "<span class='btn-icon'>&#9889;</span> Optimize with PRISM";
}

// ── Event wiring ──────────────────────────────────────────────────────────────

$("material-search").addEventListener("input", e => {
  state.material = e.target.value.trim() || null;
});

$("tool-diameter").addEventListener("change", e => {
  state.toolDiameter = parseFloat(e.target.value) || null;
});

$("flute-count").addEventListener("change", e => {
  state.fluteCount = parseInt(e.target.value) || 4;
});

$("operation-type").addEventListener("change", e => {
  state.operation = e.target.value;
});

$("btn-optimize").addEventListener("click", runOptimize);

$("btn-reset").addEventListener("click", () => {
  ["material-search","tool-diameter","flute-count","cycle-time","machine-rate"]
    .forEach(id => { $( id).value = ""; });
  $("operation-type").value = "milling";
  ["sf-rpm","sf-feed","sf-chipload","sf-toollife","sf-power","sf-confidence","cost-display"]
    .forEach(id => { $(id).textContent = "—"; });
  $("sf-warnings").innerHTML = "";
  $("strategy-display").innerHTML = "<p class='placeholder-text'>Enter material and tool to get recommendations.</p>";
  $("output-section").style.display = "none";
  Object.assign(state, { material: null, toolDiameter: null, fluteCount: 4, operation: "milling" });
});

// ── Init ──────────────────────────────────────────────────────────────────────

healthCheck();
setInterval(healthCheck, 30000);  // Re-check every 30s
`;
}

function generateUIPanelCSS(): string {
  return `/* PRISM CAM Integration Panel — CSS
 * Generated by CAMAddInFrameworkEngine (E1125)
 * Optimized for embedding in CAM system UI panels (~800x600px minimum)
 */

:root {
  --prism-bg: #1a1a2e;
  --prism-surface: #16213e;
  --prism-card: #0f3460;
  --prism-accent: #e94560;
  --prism-green: #4caf50;
  --prism-yellow: #ff9800;
  --prism-text: #eaeaea;
  --prism-muted: #8892a4;
  --prism-border: #2d4a7a;
  --prism-radius: 8px;
  --prism-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--prism-bg);
  color: var(--prism-text);
  font-family: var(--prism-font);
  font-size: 13px;
  overflow-x: hidden;
}

.prism-panel { max-width: 900px; margin: 0 auto; padding: 12px; }

.prism-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--prism-card);
  border-radius: var(--prism-radius);
  margin-bottom: 12px;
}

.prism-logo {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 3px;
  color: var(--prism-accent);
}

.prism-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--prism-muted);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--prism-muted);
}
.status-dot.online  { background: var(--prism-green); box-shadow: 0 0 6px var(--prism-green); }
.status-dot.offline { background: var(--prism-accent); }

.prism-section {
  background: var(--prism-surface);
  border: 1px solid var(--prism-border);
  border-radius: var(--prism-radius);
  padding: 14px;
  margin-bottom: 10px;
}

.prism-section h3 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--prism-muted);
  margin-bottom: 10px;
}

.input-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

input[type="text"],
input[type="number"],
select {
  background: var(--prism-card);
  border: 1px solid var(--prism-border);
  border-radius: 4px;
  color: var(--prism-text);
  padding: 7px 10px;
  font-size: 13px;
  flex: 1;
  min-width: 120px;
  outline: none;
  transition: border-color 0.15s;
}
input:focus, select:focus { border-color: var(--prism-accent); }

/* Speed/Feed grid */
.sf-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sf-card {
  background: var(--prism-card);
  border-radius: 6px;
  padding: 10px;
  text-align: center;
}

.sf-label {
  display: block;
  font-size: 10px;
  color: var(--prism-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 4px;
}

.sf-value {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: var(--prism-accent);
}

.prism-results.has-data .sf-value { color: var(--prism-green); }

.sf-warnings { margin-top: 8px; }
.warning-item {
  background: rgba(255, 152, 0, 0.1);
  border-left: 3px solid var(--prism-yellow);
  padding: 6px 10px;
  border-radius: 0 4px 4px 0;
  margin-top: 4px;
  font-size: 12px;
  color: var(--prism-yellow);
}

/* Strategy card */
.strategy-card {
  background: var(--prism-card);
  border-radius: 6px;
  padding: 12px;
  min-height: 60px;
}
.strategy-name { font-weight: 700; color: var(--prism-accent); margin-bottom: 4px; }
.strategy-desc { font-size: 12px; color: var(--prism-muted); margin-bottom: 6px; }
.strategy-card ul { margin-left: 16px; font-size: 12px; color: var(--prism-text); }
.placeholder-text { color: var(--prism-muted); font-style: italic; }

/* Cost display */
.cost-display {
  font-size: 28px;
  font-weight: 700;
  color: var(--prism-green);
  text-align: center;
  padding: 8px;
}

/* Action buttons */
.prism-actions { display: flex; gap: 10px; justify-content: center; }

.btn-optimize {
  background: var(--prism-accent);
  color: white;
  border: none;
  border-radius: var(--prism-radius);
  padding: 12px 32px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
  letter-spacing: 0.5px;
}
.btn-optimize:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
.btn-optimize:disabled { opacity: 0.4; cursor: not-allowed; }

.btn-secondary {
  background: transparent;
  color: var(--prism-muted);
  border: 1px solid var(--prism-border);
  border-radius: var(--prism-radius);
  padding: 12px 20px;
  font-size: 13px;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.btn-secondary:hover { color: var(--prism-text); border-color: var(--prism-text); }

/* Output */
.prism-output pre {
  background: #0a0a1a;
  border-radius: 6px;
  padding: 12px;
  font-size: 11px;
  font-family: "Consolas", "Monaco", monospace;
  color: #7ec8e3;
  overflow-x: auto;
  max-height: 300px;
  white-space: pre-wrap;
  word-break: break-word;
}

.tool-search-row { position: relative; margin-top: 8px; }
.dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--prism-card);
  border: 1px solid var(--prism-border);
  border-radius: 0 0 4px 4px;
  z-index: 100;
  max-height: 180px;
  overflow-y: auto;
  display: none;
}
.dropdown.open { display: block; }
.dropdown-item {
  padding: 7px 12px;
  cursor: pointer;
  font-size: 12px;
}
.dropdown-item:hover { background: var(--prism-border); }

@media (max-width: 500px) {
  .sf-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
}

// ── Tool Sync Module templates ────────────────────────────────────────────────

function generateToolSyncPython(camSystem: CamSystem): string {
  const camName = camSystem.toUpperCase();
  return `#!/usr/bin/env python3
"""
PRISM Tool Sync Module — ${camName} (Python)
Generated by CAMAddInFrameworkEngine (E1125)

Synchronizes tool libraries between PRISM (95K+ tools) and ${camName}.
Three modes:
  - import_from_prism: Pull tools from PRISM into ${camName} native library
  - export_to_prism:   Push ${camName} tools to PRISM for analysis
  - detect_drift:      Compare both libraries and report differences
"""

import json
import hashlib
from typing import Any, Dict, List, Optional
from prism_client import PRISMClient  # Use generated HTTP client


class PRISMToolSync:
    """Tool library synchronization between PRISM and ${camName}."""

    def __init__(self, prism_url: str = "http://localhost:${PRISM_PORT}"):
        self.client = PRISMClient(prism_url)
        self.cam_system = "${camSystem}"

    def _tool_fingerprint(self, tool: Dict[str, Any]) -> str:
        """Stable hash for drift detection."""
        key = json.dumps({
            k: tool.get(k)
            for k in ["manufacturer", "designation", "diameter_mm",
                       "flutes", "type", "grade"]
        }, sort_keys=True, default=str)
        return hashlib.sha256(key.encode()).hexdigest()[:12]

    def import_from_prism(
        self,
        filter_material: Optional[str] = None,
        filter_type: Optional[str] = None,
        max_tools: int = 500,
    ) -> Dict[str, Any]:
        """
        Fetch tools from PRISM catalog and return in ${camName}-compatible format.

        Returns:
            {tools: [...], count: int, skipped: int, warnings: [...]}
        """
        params: Dict[str, Any] = {"max_tools": max_tools}
        if filter_material:
            params["iso_group"] = filter_material
        if filter_type:
            params["tool_type"] = filter_type

        result = self.client.call_tool("prism_tool", {
            "action": "tool_search",
            "params": params,
        })

        tools = result.get("tools", [])
        converted = []
        skipped = 0
        warnings = []

        for t in tools:
            try:
                converted.append(self._convert_to_cam_format(t))
            except Exception as e:
                skipped += 1
                warnings.append(f"Skipped tool {t.get('id', '?')}: {e}")

        return {
            "tools": converted,
            "count": len(converted),
            "skipped": skipped,
            "warnings": warnings,
            "source": "PRISM",
            "cam_target": self.cam_system,
        }

    def export_to_prism(self, cam_tools: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Export ${camName} tool library to PRISM for analysis/comparison.

        Args:
            cam_tools: List of tool records from ${camName} native library

        Returns:
            PRISM response with ingested count and analysis
        """
        prism_tools = [self._convert_from_cam_format(t) for t in cam_tools]

        return self.client.call_tool("prism_cam", {
            "action": "universal_tool_export",
            "params": {
                "tools": prism_tools,
                "format": "json",
                "source_cam": self.cam_system,
            },
        })

    def detect_drift(
        self,
        cam_tools: List[Dict[str, Any]],
        prism_filter: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Detect drift between ${camName} library and PRISM catalog.

        Returns:
            {
                only_in_cam: [...],
                only_in_prism: [...],
                in_both: [...],
                drift_score: float,  # 0=identical, 1=completely different
                recommendations: [...]
            }
        """
        # Build fingerprint sets
        cam_fps = {self._tool_fingerprint(t): t for t in cam_tools}

        # Fetch comparable PRISM tools
        prism_params = prism_filter or {}
        prism_params["max_tools"] = 5000
        prism_result = self.client.call_tool("prism_tool", {
            "action": "tool_search",
            "params": prism_params,
        })
        prism_tools = prism_result.get("tools", [])
        prism_fps = {self._tool_fingerprint(t): t for t in prism_tools}

        cam_set = set(cam_fps.keys())
        prism_set = set(prism_fps.keys())
        common = cam_set & prism_set

        only_cam = [cam_fps[fp] for fp in cam_set - prism_set]
        only_prism = [prism_fps[fp] for fp in prism_set - cam_set]
        in_both = [cam_fps[fp] for fp in common]

        total = len(cam_set | prism_set)
        drift = 1.0 - (len(common) / total) if total > 0 else 0.0

        recommendations = []
        if drift > 0.5:
            recommendations.append(
                f"High drift ({drift:.0%}): consider running import_from_prism "
                "to refresh ${camName} library"
            )
        if len(only_cam) > 50:
            recommendations.append(
                f"{len(only_cam)} ${camName}-only tools not in PRISM — "
                "run export_to_prism to register them"
            )

        return {
            "only_in_cam": only_cam[:100],
            "only_in_prism": only_prism[:100],
            "in_both": in_both[:100],
            "drift_score": round(drift, 4),
            "cam_tool_count": len(cam_tools),
            "prism_tool_count": len(prism_tools),
            "matched_count": len(common),
            "recommendations": recommendations,
        }

    def _convert_to_cam_format(self, prism_tool: Dict[str, Any]) -> Dict[str, Any]:
        """Convert PRISM tool record to ${camName} native format. Customize as needed."""
        return {
            "name": prism_tool.get("designation", prism_tool.get("id", "Unknown")),
            "manufacturer": prism_tool.get("manufacturer", ""),
            "type": prism_tool.get("tool_type", prism_tool.get("type", "endmill")),
            "diameter_mm": prism_tool.get("diameter_mm",
                           prism_tool.get("cutting_diameter_mm", 0)),
            "flutes": prism_tool.get("flutes", prism_tool.get("flute_count", 4)),
            "overall_length_mm": prism_tool.get("overall_length_mm",
                                  prism_tool.get("length_mm", 0)),
            "cutting_length_mm": prism_tool.get("cutting_length_mm",
                                  prism_tool.get("flute_length_mm", 0)),
            "material": prism_tool.get("material", "carbide"),
            "coating": prism_tool.get("coating", ""),
            "grade": prism_tool.get("grade", ""),
            "prism_id": prism_tool.get("id", ""),
            "_source": "PRISM",
        }

    def _convert_from_cam_format(self, cam_tool: Dict[str, Any]) -> Dict[str, Any]:
        """Convert ${camName} tool record to PRISM format. Customize as needed."""
        return {
            "id": cam_tool.get("prism_id", cam_tool.get("id", "")),
            "designation": cam_tool.get("name", cam_tool.get("designation", "")),
            "manufacturer": cam_tool.get("manufacturer", ""),
            "tool_type": cam_tool.get("type", cam_tool.get("tool_type", "endmill")),
            "diameter_mm": cam_tool.get("diameter_mm", 0),
            "flutes": cam_tool.get("flutes", 4),
            "overall_length_mm": cam_tool.get("overall_length_mm", 0),
            "cutting_length_mm": cam_tool.get("cutting_length_mm", 0),
            "material": cam_tool.get("material", "carbide"),
            "coating": cam_tool.get("coating", ""),
            "grade": cam_tool.get("grade", ""),
            "_source": "${camSystem}",
        }


# ── Example usage ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    sync = PRISMToolSync()

    # Check server
    if not sync.client.health_check():
        print("ERROR: PRISM server not reachable")
        exit(1)

    # Import aluminum-suitable tools from PRISM
    imported = sync.import_from_prism(filter_material="N", max_tools=200)
    print(f"Imported {imported['count']} tools from PRISM")
    if imported["warnings"]:
        print("Warnings:", imported["warnings"][:3])
`;
}

function generateToolSyncCSharp(camSystem: CamSystem): string {
  const camName = camSystem.toUpperCase();
  return `// PRISM Tool Sync Module — ${camName} (C#)
// Generated by CAMAddInFrameworkEngine (E1125)
// Requires: Newtonsoft.Json, PRISMClient class

using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace PRISMAddIn
{
    public class ToolSyncResult
    {
        public List<Dictionary<string, object>> Tools { get; set; } = new();
        public int Count { get; set; }
        public int Skipped { get; set; }
        public List<string> Warnings { get; set; } = new();
        public string Source { get; set; }
        public string CamTarget { get; set; }
    }

    public class DriftResult
    {
        public List<Dictionary<string, object>> OnlyInCam { get; set; } = new();
        public List<Dictionary<string, object>> OnlyInPrism { get; set; } = new();
        public List<Dictionary<string, object>> InBoth { get; set; } = new();
        public double DriftScore { get; set; }
        public int CamToolCount { get; set; }
        public int PrismToolCount { get; set; }
        public int MatchedCount { get; set; }
        public List<string> Recommendations { get; set; } = new();
    }

    public class PRISMToolSync
    {
        private readonly PRISMClient _client;
        private const string CamSystem = "${camSystem}";

        public PRISMToolSync(string prismUrl = PRISMClient.DefaultUrl)
        {
            _client = new PRISMClient(prismUrl);
        }

        private string ToolFingerprint(Dictionary<string, object> tool)
        {
            var key = new { manufacturer = Get(tool,"manufacturer"), designation = Get(tool,"designation"),
                diameter = Get(tool,"diameter_mm"), flutes = Get(tool,"flutes"),
                type = Get(tool,"type"), grade = Get(tool,"grade") };
            var json = JsonConvert.SerializeObject(key);
            using var sha = SHA256.Create();
            var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(json));
            return BitConverter.ToString(hash).Replace("-","").Substring(0, 12).ToLower();
        }

        private static string Get(Dictionary<string, object> d, string k)
            => d.TryGetValue(k, out var v) ? v?.ToString() ?? "" : "";

        public async Task<ToolSyncResult> ImportFromPrismAsync(
            string filterMaterial = null, string filterType = null, int maxTools = 500)
        {
            var p = new Dictionary<string, object> { ["max_tools"] = maxTools };
            if (filterMaterial != null) p["iso_group"] = filterMaterial;
            if (filterType != null) p["tool_type"] = filterType;

            var result = await _client.CallToolAsync("prism_tool",
                new Dictionary<string, object> { ["action"] = "tool_search", ["params"] = p });

            var tools = result.ContainsKey("tools")
                ? JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(result["tools"].ToString())
                : new List<Dictionary<string, object>>();

            var converted = new List<Dictionary<string, object>>();
            int skipped = 0;
            var warnings = new List<string>();

            foreach (var t in tools)
            {
                try { converted.Add(ConvertToCamFormat(t)); }
                catch (Exception ex) { skipped++; warnings.Add($"Skipped {Get(t,"id")}: {ex.Message}"); }
            }

            return new ToolSyncResult
            {
                Tools = converted, Count = converted.Count,
                Skipped = skipped, Warnings = warnings,
                Source = "PRISM", CamTarget = CamSystem,
            };
        }

        public async Task<DriftResult> DetectDriftAsync(
            List<Dictionary<string, object>> camTools,
            Dictionary<string, object> prismFilter = null)
        {
            var camFps = camTools.ToDictionary(ToolFingerprint, t => t);
            var pParams = prismFilter ?? new Dictionary<string, object>();
            pParams["max_tools"] = 5000;

            var prismResult = await _client.CallToolAsync("prism_tool",
                new Dictionary<string, object> { ["action"] = "tool_search", ["params"] = pParams });
            var prismTools = prismResult.ContainsKey("tools")
                ? JsonConvert.DeserializeObject<List<Dictionary<string, object>>>(prismResult["tools"].ToString())
                : new List<Dictionary<string, object>>();
            var prismFps = prismTools.ToDictionary(ToolFingerprint, t => t);

            var camSet = new HashSet<string>(camFps.Keys);
            var prismSet = new HashSet<string>(prismFps.Keys);
            var common = new HashSet<string>(camSet);
            common.IntersectWith(prismSet);

            double total = camSet.Union(prismSet).Count();
            double drift = total > 0 ? 1.0 - (common.Count / total) : 0.0;

            var recs = new List<string>();
            if (drift > 0.5) recs.Add($"High drift ({drift:P0}): run ImportFromPrism to refresh library");
            var onlyCam = camSet.Except(prismSet).Select(fp => camFps[fp]).Take(100).ToList();
            if (onlyCam.Count > 50) recs.Add($"{onlyCam.Count} ${camName}-only tools — run ExportToPrism");

            return new DriftResult
            {
                OnlyInCam = onlyCam,
                OnlyInPrism = prismSet.Except(camSet).Select(fp => prismFps[fp]).Take(100).ToList(),
                InBoth = common.Select(fp => camFps[fp]).Take(100).ToList(),
                DriftScore = Math.Round(drift, 4),
                CamToolCount = camTools.Count, PrismToolCount = prismTools.Count,
                MatchedCount = common.Count, Recommendations = recs,
            };
        }

        private Dictionary<string, object> ConvertToCamFormat(Dictionary<string, object> t)
        {
            return new Dictionary<string, object>
            {
                ["name"] = Get(t,"designation") is var d when d.Length>0 ? d : Get(t,"id"),
                ["manufacturer"] = Get(t,"manufacturer"),
                ["type"] = Get(t,"tool_type") is var tt when tt.Length>0 ? tt : Get(t,"type"),
                ["diameter_mm"] = t.GetValueOrDefault("diameter_mm") ?? t.GetValueOrDefault("cutting_diameter_mm") ?? 0,
                ["flutes"] = t.GetValueOrDefault("flutes") ?? t.GetValueOrDefault("flute_count") ?? 4,
                ["material"] = Get(t,"material") is var m when m.Length>0 ? m : "carbide",
                ["coating"] = Get(t,"coating"),
                ["grade"] = Get(t,"grade"),
                ["prism_id"] = Get(t,"id"),
                ["_source"] = "PRISM",
            };
        }
    }
}
`;
}

// ── Post Processor Integration templates ─────────────────────────────────────

function generatePostIntegrationPython(camSystem: CamSystem): string {
  const camName = camSystem.charAt(0).toUpperCase() + camSystem.slice(1);
  return `#!/usr/bin/env python3
"""
PRISM Post-Processor Integration — ${camName} (Python)
Generated by CAMAddInFrameworkEngine (E1125)

Sends G-code to PRISM for per-block S/F optimization (AutoSpeedFeedEngine),
receives optimized G-code back, and applies PRISM tribal knowledge warnings.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from prism_client import PRISMClient


class PRISMPostIntegration:
    """PRISM post-processor integration for ${camName}."""

    def __init__(self, prism_url: str = "http://localhost:${PRISM_PORT}"):
        self.client = PRISMClient(prism_url)
        self.cam_system = "${camSystem}"

    def optimize_gcode(
        self,
        gcode: str,
        material: str,
        tool_diameter_mm: float,
        apply_tribal: bool = True,
    ) -> Dict[str, Any]:
        """
        Send G-code to PRISM for per-block S/F optimization.

        Args:
            gcode: Raw G-code string from ${camName} post-processor
            material: Workpiece material (e.g., "6061", "4140", "316")
            tool_diameter_mm: Active tool diameter in mm
            apply_tribal: If True, prepend tribal knowledge warnings as comments

        Returns:
            {
                optimized_gcode: str,
                original_lines: int,
                optimized_lines: int,
                changes: int,
                warnings: List[str],
                tribal_tips: List[str],
            }
        """
        result = self.client.call_tool("prism_cam", {
            "action": "post_feed_optimize",
            "params": {
                "gcode": gcode,
                "material": material,
                "tool_diameter_mm": tool_diameter_mm,
            },
        })

        optimized = result.get("optimized_gcode", gcode)
        warnings = result.get("warnings", [])
        changes = result.get("changes_applied", 0)

        tribal_tips = []
        if apply_tribal:
            tribal_result = self.client.call_tool("prism_calc", {
                "action": "sdk_get_tip",
                "params": {
                    "material": material,
                    "cam_system": self.cam_system,
                },
            })
            tips = tribal_result.get("tips", [])
            tribal_tips = [t["text"] for t in tips[:5] if t.get("relevance", 0) > 0.5]
            if tribal_tips:
                header = "\\n".join(f"( PRISM TIP: {tip} )" for tip in tribal_tips)
                optimized = header + "\\n" + optimized

        original_lines = len(gcode.splitlines())
        optimized_lines = len(optimized.splitlines())

        return {
            "optimized_gcode": optimized,
            "original_lines": original_lines,
            "optimized_lines": optimized_lines,
            "changes": changes,
            "warnings": warnings,
            "tribal_tips": tribal_tips,
        }

    def analyze_gcode(self, gcode: str) -> Dict[str, Any]:
        """
        Analyze G-code for safety issues and optimization opportunities.

        Returns:
            {safe: bool, issues: [...], score: int, opportunities: [...]}
        """
        result = self.client.call_tool("prism_calc", {
            "action": "sdk_check_safety",
            "params": {"gcode": gcode},
        })

        # Also check feed optimization opportunities
        feed_result = self.client.call_tool("prism_cam", {
            "action": "post_feed_analyze",
            "params": {"gcode": gcode},
        })

        opportunities = feed_result.get("opportunities", [])

        return {
            "safe": result.get("safe", True),
            "issues": result.get("issues", []),
            "score": result.get("score", 100),
            "opportunities": opportunities,
        }

    def batch_optimize(
        self,
        programs: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Batch-optimize multiple G-code programs.

        Args:
            programs: List of {gcode, material, tool_diameter_mm, name?}

        Returns:
            List of optimization results
        """
        results = []
        for prog in programs:
            try:
                r = self.optimize_gcode(
                    gcode=prog["gcode"],
                    material=prog["material"],
                    tool_diameter_mm=prog["tool_diameter_mm"],
                    apply_tribal=prog.get("apply_tribal", True),
                )
                r["name"] = prog.get("name", "unnamed")
                r["success"] = True
                results.append(r)
            except Exception as e:
                results.append({
                    "name": prog.get("name", "unnamed"),
                    "success": False,
                    "error": str(e),
                })
        return results


# ── Example usage ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    post = PRISMPostIntegration()

    if not post.client.health_check():
        print("ERROR: PRISM server not reachable")
        exit(1)

    sample_gcode = """
%
O0001 (TEST PROGRAM)
G90 G17 G40 G49 G80
T01 M06
G00 X0 Y0 Z50. S1200 M03
G43 H01 Z5.
G01 Z-5. F100
G01 X100. F100
G01 Y100. F100
G01 X0 F100
G01 Y0 F100
G00 Z50.
M05
M30
%
"""

    result = post.optimize_gcode(
        gcode=sample_gcode.strip(),
        material="6061",
        tool_diameter_mm=12.0,
        apply_tribal=True,
    )
    print(f"Changes: {result['changes']}, Lines: {result['original_lines']} -> {result['optimized_lines']}")
    if result["warnings"]:
        print("Warnings:", result["warnings"])
    print("\\nOptimized G-code (first 500 chars):")
    print(result["optimized_gcode"][:500])
`;
}

// ── Main engine class ─────────────────────────────────────────────────────────

export class CAMAddInFrameworkEngine {

  /**
   * listSupportedSystems — Returns all CAM systems with available add-in support.
   */
  listSupportedSystems(): { systems: SupportedSystem[] } {
    return { systems: SUPPORTED_SYSTEMS };
  }

  /**
   * generateHTTPClient — Generate HTTP client code for connecting to PRISM MCP server.
   */
  generateHTTPClient(language: Language): HTTPClientResult {
    let code: string;
    let description: string;

    switch (language) {
      case "python":
        code = generateHTTPClientPython();
        description = "Python HTTP client using urllib (stdlib only, no external deps). "
          + "Compatible with NX Open, hyperMILL, Fusion 360, and PowerMill environments.";
        break;
      case "csharp":
        code = generateHTTPClientCSharp();
        description = "C# .NET HTTP client using HttpClient. Requires Newtonsoft.Json. "
          + "Designed for Mastercam .NET add-ins.";
        break;
      case "vba":
        code = generateHTTPClientVBA();
        description = "VBA HTTP client using WinHTTP 5.1 (no external deps). "
          + "Compatible with SolidCAM (SolidWorks) and CATIA scripting environments.";
        break;
      case "javascript":
        code = generateHTTPClientJavaScript();
        description = "JavaScript HTTP client using fetch API. "
          + "Compatible with Fusion 360 JavaScript add-ins and browser environments.";
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    return { language, code, description };
  }

  /**
   * generateUIPanel — Generate Material Design-inspired HTML/JS/CSS UI panel.
   */
  generateUIPanel(): UIPanelResult {
    return {
      html: generateUIPanelHTML(),
      js: generateUIPanelJS(),
      css: generateUIPanelCSS(),
      description: "Material Design-inspired panel with material selector (2,957 materials), "
        + "tool selector (95K tools), speed/feed display, strategy recommendation, "
        + "cost estimate, and Optimize button calling PRISM pipeline.",
    };
  }

  /**
   * generateToolSyncModule — Generate tool library sync code.
   */
  generateToolSyncModule(camSystem: CamSystem, language: Language): ToolSyncResult {
    let code: string;
    let description: string;

    switch (language) {
      case "python":
        code = generateToolSyncPython(camSystem);
        description = `Python tool sync for ${camSystem}: import from PRISM (95K tools), `
          + "export to PRISM, and drift detection with fingerprinting.";
        break;
      case "csharp":
        code = generateToolSyncCSharp(camSystem);
        description = `C# tool sync for ${camSystem}: ImportFromPrism, ExportToPrism, `
          + "and DetectDrift with SHA-256 fingerprinting. Requires Newtonsoft.Json.";
        break;
      default:
        throw new Error(
          `Tool sync for language '${language}' not yet available. `
          + "Supported: python, csharp",
        );
    }

    return { cam_system: camSystem, language, code, description };
  }

  /**
   * generatePostIntegration — Generate post-processor integration code.
   */
  generatePostIntegration(camSystem: CamSystem): PostIntegrationResult {
    const supported: CamSystem[] = [
      "mastercam", "solidcam", "nx", "hypermill", "fusion360", "powermill", "catia",
    ];
    if (!supported.includes(camSystem)) {
      throw new Error(`Unknown CAM system: ${camSystem}. Supported: ${supported.join(", ")}`);
    }
    const code = generatePostIntegrationPython(camSystem);
    const description = `Python post-processor integration for ${camSystem}. `
      + "Sends G-code to PRISM AutoSpeedFeedEngine for per-block optimization, "
      + "receives optimized G-code back, and applies PRISM tribal knowledge warnings "
      + "as program comments.";
    return { cam_system: camSystem, code, description };
  }

  /**
   * generateAddIn — Generate a complete add-in package for a CAM system.
   */
  generateAddIn(
    camSystem: CamSystem,
    language: Language,
    features: FeatureType[],
  ): AddInResult {
    const sys = SUPPORTED_SYSTEMS.find(s => s.cam_system === camSystem);
    if (!sys) {
      throw new Error(
        `Unknown CAM system: '${camSystem}'. `
        + `Supported: ${SUPPORTED_SYSTEMS.map(s => s.cam_system).join(", ")}`,
      );
    }

    const unsupported = features.filter(f => !sys.features_supported.includes(f));
    const notes: string[] = [];
    if (unsupported.length > 0) {
      notes.push(
        `Features not supported for ${camSystem}: ${unsupported.join(", ")}. `
        + "They will be skipped.",
      );
    }

    const enabledFeatures = features.filter(f => sys.features_supported.includes(f));
    const files: GeneratedFile[] = [];
    const installInstructions: string[] = [];

    // HTTP Client
    if (enabledFeatures.includes("http_client")) {
      const client = this.generateHTTPClient(language);
      const ext = { python: "py", csharp: "cs", vba: "bas", javascript: "js" }[language];
      files.push({
        path: `prism_addin/prism_client.${ext}`,
        content: client.code,
        language,
        description: client.description,
      });
    }

    // UI Panel
    if (enabledFeatures.includes("ui_panel")) {
      const panel = this.generateUIPanel();
      files.push(
        {
          path: "prism_addin/ui/prism-panel.html",
          content: panel.html,
          language: "html",
          description: "PRISM integration panel HTML",
        },
        {
          path: "prism_addin/ui/prism-panel.js",
          content: panel.js,
          language: "javascript",
          description: "PRISM integration panel JavaScript",
        },
        {
          path: "prism_addin/ui/prism-panel.css",
          content: panel.css,
          language: "css",
          description: "PRISM integration panel stylesheet",
        },
      );
    }

    // Tool Sync
    if (enabledFeatures.includes("tool_sync")) {
      const syncLang = (language === "python" || language === "csharp")
        ? language : "python";
      const sync = this.generateToolSyncModule(camSystem, syncLang);
      const ext = syncLang === "python" ? "py" : "cs";
      files.push({
        path: `prism_addin/prism_tool_sync.${ext}`,
        content: sync.code,
        language: syncLang,
        description: sync.description,
      });
    }

    // Post Integration
    if (enabledFeatures.includes("post_integration")) {
      const postInt = this.generatePostIntegration(camSystem);
      files.push({
        path: "prism_addin/prism_post_integration.py",
        content: postInt.code,
        language: "python",
        description: postInt.description,
      });
    }

    // Build install instructions
    installInstructions.push(
      `1. Ensure PRISM MCP server is running at ${PRISM_BASE_URL}`,
      `2. CAM system: ${sys.display_name} — ${sys.plugin_type}`,
    );

    if (language === "python") {
      installInstructions.push(
        "3. No external dependencies required for HTTP client (uses stdlib urllib)",
        "4. Copy prism_addin/ folder to your CAM system scripts directory",
      );
    } else if (language === "csharp") {
      installInstructions.push(
        "3. Install NuGet: Newtonsoft.Json",
        "4. Add reference to: System.Net.Http",
        "5. Build as Class Library targeting .NET 4.8",
        "6. Copy DLL to Mastercam addins directory",
      );
    } else if (language === "vba") {
      installInstructions.push(
        "3. Enable: Microsoft WinHTTP Services 5.1 (Tools > References)",
        "4. Import .bas files into VBA project",
      );
    }

    installInstructions.push(sys.notes);

    return {
      cam_system: camSystem,
      language,
      features: enabledFeatures,
      files,
      install_instructions: installInstructions,
      notes,
    };
  }

  /**
   * Unified calculate entry point for dispatcher wiring.
   */
  calculate(action: string, params: Record<string, unknown>): unknown {
    switch (action) {
      case "cam_addin_generate": {
        const camSystem = (params.cam_system ?? params.camSystem) as CamSystem;
        const language = (params.language ?? "python") as Language;
        const features = (params.features ?? [
          "http_client", "ui_panel", "tool_sync", "post_integration",
        ]) as FeatureType[];
        return this.generateAddIn(camSystem, language, features);
      }
      case "cam_addin_http_client": {
        const language = (params.language ?? "python") as Language;
        return this.generateHTTPClient(language);
      }
      case "cam_addin_ui_panel":
        return this.generateUIPanel();
      case "cam_addin_tool_sync": {
        const camSystem = (params.cam_system ?? params.camSystem) as CamSystem;
        const language = (params.language ?? "python") as Language;
        return this.generateToolSyncModule(camSystem, language);
      }
      case "cam_addin_post_integration": {
        const camSystem = (params.cam_system ?? params.camSystem) as CamSystem;
        return this.generatePostIntegration(camSystem);
      }
      case "cam_addin_list_systems":
        return this.listSupportedSystems();
      default:
        throw new Error(`CAMAddInFrameworkEngine: unknown action "${action}"`);
    }
  }
}

export const camAddInFrameworkEngine = new CAMAddInFrameworkEngine();
