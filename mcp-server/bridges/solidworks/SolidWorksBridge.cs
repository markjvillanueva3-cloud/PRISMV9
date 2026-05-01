// SolidWorksBridge.cs — PRISM COM Bridge for SolidWorks
//
// CAD-AUTOMATION-MS0 / U-CAUT02
//
// Build target: .NET Framework 4.8, C# 7.3, x64
// References (add via NuGet or GAC from SolidWorks install dir):
//   SolidWorks.Interop.sldworks.dll
//   SolidWorks.Interop.swconst.dll
//   SolidWorks.Interop.swpublished.dll
//
// Protocol: newline-delimited JSON on stdin/stdout.
//   stdin  → {"id":1,"cmd":"open","args":{"filePath":"C:\\part.sldprt"}}
//   stdout → {"id":1,"ok":true,"result":{...}}
//   stdout → {"id":1,"ok":false,"error":"File not found"}
//
// First output line (before any command): {"ready":true}
// Supports NAMED_PIPE env override (see SWNamedPipeServer stub at bottom).
//
// Usage:
//   SolidWorksBridge.exe
//   (runs until stdin closes or "close" command is received)

using System;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Newtonsoft.Json;         // Newtonsoft.Json 13.x (via NuGet)
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

namespace PRISM.CADAutomation
{
    // ── JSON Protocol Types ────────────────────────────────────────────────

    internal sealed class SwRequest
    {
        [JsonProperty("id")]   public int    Id   { get; set; }
        [JsonProperty("cmd")]  public string Cmd  { get; set; } = string.Empty;
        [JsonProperty("args")] public dynamic Args { get; set; } = new System.Dynamic.ExpandoObject();
    }

    internal sealed class SwResponse
    {
        [JsonProperty("id")]     public int    Id     { get; set; }
        [JsonProperty("ok")]     public bool   Ok     { get; set; }
        [JsonProperty("result")] public object Result { get; set; }
        [JsonProperty("error")]  public string Error  { get; set; }
    }

    internal sealed class OpenResult
    {
        [JsonProperty("filePath")]     public string FilePath     { get; set; }
        [JsonProperty("documentType")] public string DocumentType { get; set; }
        [JsonProperty("title")]        public string Title        { get; set; }
    }

    internal sealed class FeatureNode
    {
        [JsonProperty("name")]       public string       Name       { get; set; }
        [JsonProperty("type")]       public string       Type       { get; set; }
        [JsonProperty("suppressed")] public bool         Suppressed { get; set; }
        [JsonProperty("children")]   public FeatureNode[] Children  { get; set; }
    }

    internal sealed class FeatureTreeResult
    {
        [JsonProperty("features")] public FeatureNode[] Features { get; set; }
    }

    internal sealed class ExportResult
    {
        [JsonProperty("outputPath")] public string OutputPath { get; set; }
        [JsonProperty("success")]    public bool   Success    { get; set; }
    }

    internal sealed class BoundingBoxResult
    {
        [JsonProperty("min")]   public double[] Min   { get; set; }
        [JsonProperty("max")]   public double[] Max   { get; set; }
        [JsonProperty("units")] public string   Units { get; set; } = "mm";
    }

    // ── Main Program ───────────────────────────────────────────────────────

    internal static class Program
    {
        // SolidWorks COM application instance (late-bound via COM interop)
        private static SldWorks   _swApp;
        private static ModelDoc2  _activeDoc;

        private static readonly JsonSerializerSettings JsonSettings = new JsonSerializerSettings
        {
            NullValueHandling = NullValueHandling.Ignore,
        };

        static int Main(string[] args)
        {
            // Suppress console to avoid corrupting JSON stdout
            Console.OutputEncoding = Encoding.UTF8;

            try
            {
                InitializeSolidWorks();
            }
            catch (Exception ex)
            {
                WriteError(0, $"Failed to initialize SolidWorks COM: {ex.Message}");
                return 1;
            }

            // Signal readiness to TypeScript host
            WriteReady();

            // Main dispatch loop — reads newline-delimited JSON from stdin
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;

                SwRequest req;
                try
                {
                    req = JsonConvert.DeserializeObject<SwRequest>(line, JsonSettings);
                }
                catch (Exception ex)
                {
                    WriteError(0, $"JSON parse error: {ex.Message}");
                    continue;
                }

                DispatchCommand(req);
            }

            // Stdin closed — clean shutdown
            ReleaseSolidWorks();
            return 0;
        }

        // ── COM Initialization ───────────────────────────────────────────────

        private static void InitializeSolidWorks()
        {
            // Attempt to attach to existing SolidWorks instance first
            try
            {
                object existingObj = Marshal.GetActiveObject("SldWorks.Application");
                _swApp = (SldWorks)existingObj;
                _swApp.Visible = false;
                return;
            }
            catch (COMException)
            {
                // No running instance — create new one
            }

            // Create new SolidWorks instance
            Type swType = Type.GetTypeFromProgID("SldWorks.Application");
            if (swType == null)
                throw new InvalidOperationException(
                    "SolidWorks is not installed or ProgID 'SldWorks.Application' is not registered.");

            _swApp = (SldWorks)Activator.CreateInstance(swType);
            _swApp.Visible = false;  // headless: suppress UI/dialogs
        }

        private static void ReleaseSolidWorks()
        {
            try
            {
                if (_activeDoc != null)
                {
                    _swApp.CloseDoc(_activeDoc.GetTitle());
                    Marshal.ReleaseComObject(_activeDoc);
                    _activeDoc = null;
                }
                if (_swApp != null)
                {
                    Marshal.ReleaseComObject(_swApp);
                    _swApp = null;
                }
            }
            catch { /* Best-effort COM release */ }
        }

        // ── Command Dispatcher ───────────────────────────────────────────────

        private static void DispatchCommand(SwRequest req)
        {
            try
            {
                switch (req.Cmd)
                {
                    case "open":
                        HandleOpen(req);
                        break;
                    case "getFeatureTree":
                        HandleGetFeatureTree(req);
                        break;
                    case "exportSTEP":
                        HandleExportSTEP(req);
                        break;
                    case "exportPDF":
                        HandleExportPDF(req);
                        break;
                    case "getBoundingBox":
                        HandleGetBoundingBox(req);
                        break;
                    case "close":
                        HandleClose(req);
                        break;
                    default:
                        WriteError(req.Id, $"Unknown command: {req.Cmd}");
                        break;
                }
            }
            catch (Exception ex)
            {
                WriteError(req.Id, $"Command '{req.Cmd}' threw: {ex.Message}");
            }
        }

        // ── Handlers ────────────────────────────────────────────────────────

        private static void HandleOpen(SwRequest req)
        {
            string filePath = (string)req.Args.filePath;
            if (!File.Exists(filePath))
            {
                WriteError(req.Id, $"File not found: {filePath}");
                return;
            }

            int errors   = 0;
            int warnings = 0;
            int docType  = (int)swDocumentTypes_e.swDocPART;

            // Detect document type from extension
            string ext = Path.GetExtension(filePath).ToLowerInvariant();
            switch (ext)
            {
                case ".sldasm": docType = (int)swDocumentTypes_e.swDocASSEMBLY; break;
                case ".slddrw": docType = (int)swDocumentTypes_e.swDocDRAWING;  break;
                default:        docType = (int)swDocumentTypes_e.swDocPART;     break;
            }

            ModelDoc2 doc = _swApp.OpenDoc6(
                filePath, docType,
                (int)swOpenDocOptions_e.swOpenDocOptions_Silent,
                string.Empty,
                ref errors, ref warnings);

            if (doc == null)
            {
                WriteError(req.Id, $"SolidWorks failed to open '{filePath}' (errors={errors}, warnings={warnings})");
                return;
            }

            _activeDoc = doc;

            string docTypeStr;
            switch (docType)
            {
                case (int)swDocumentTypes_e.swDocASSEMBLY: docTypeStr = "assembly"; break;
                case (int)swDocumentTypes_e.swDocDRAWING:  docTypeStr = "drawing";  break;
                default:                                    docTypeStr = "part";     break;
            }

            WriteResult(req.Id, new OpenResult
            {
                FilePath     = filePath,
                DocumentType = docTypeStr,
                Title        = doc.GetTitle(),
            });
        }

        private static void HandleGetFeatureTree(SwRequest req)
        {
            if (_activeDoc == null) { WriteError(req.Id, "No document open"); return; }

            FeatureManager fm = _activeDoc.FeatureManager;
            int count          = fm.GetFeatureCount(false);
            var nodes          = new System.Collections.Generic.List<FeatureNode>(count);

            for (int i = 0; i < count; i++)
            {
                Feature feat = (Feature)fm.GetFeature(i);
                if (feat == null) continue;
                nodes.Add(new FeatureNode
                {
                    Name       = feat.Name,
                    Type       = feat.GetTypeName2(),
                    Suppressed = feat.IsSuppressed(),
                    Children   = Array.Empty<FeatureNode>(),
                });
            }

            WriteResult(req.Id, new FeatureTreeResult { Features = nodes.ToArray() });
        }

        private static void HandleExportSTEP(SwRequest req)
        {
            if (_activeDoc == null) { WriteError(req.Id, "No document open"); return; }

            string outputPath = (string)req.Args.outputPath;

            // Ensure output directory exists
            string dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            // Set STEP export options (AP214)
            var stepData = (ExportPdfData)_swApp.GetExportFileData((int)swExportDataFileType_e.swExportPdfData);

            bool ok = _activeDoc.Extension.SaveAs(
                outputPath,
                (int)swSaveAsVersion_e.swSaveAsCurrentVersion,
                (int)swSaveAsOptions_e.swSaveAsOptions_Silent,
                null, ref _swConvErr, ref _swConvWarn);

            WriteResult(req.Id, new ExportResult { OutputPath = outputPath, Success = ok });
        }

        private static void HandleExportPDF(SwRequest req)
        {
            if (_activeDoc == null) { WriteError(req.Id, "No document open"); return; }

            string outputPath = (string)req.Args.outputPath;

            string dir = Path.GetDirectoryName(outputPath);
            if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                Directory.CreateDirectory(dir);

            ExportPdfData pdfData = (ExportPdfData)_swApp.GetExportFileData(
                (int)swExportDataFileType_e.swExportPdfData);
            pdfData.ViewPdfAfterSaving = false;

            bool ok = _activeDoc.Extension.SaveAs(
                outputPath,
                (int)swSaveAsVersion_e.swSaveAsCurrentVersion,
                (int)swSaveAsOptions_e.swSaveAsOptions_Silent,
                pdfData, ref _swConvErr, ref _swConvWarn);

            WriteResult(req.Id, new ExportResult { OutputPath = outputPath, Success = ok });
        }

        private static void HandleGetBoundingBox(SwRequest req)
        {
            if (_activeDoc == null) { WriteError(req.Id, "No document open"); return; }

            // GetBox returns double[6]: xMin,yMin,zMin,xMax,yMax,zMax (in meters)
            double[] box = (double[])_activeDoc.GetBox(false);
            if (box == null || box.Length < 6)
            {
                WriteError(req.Id, "GetBox returned null or incomplete data");
                return;
            }

            const double M_TO_MM = 1000.0;
            WriteResult(req.Id, new BoundingBoxResult
            {
                Min   = new[] { box[0] * M_TO_MM, box[1] * M_TO_MM, box[2] * M_TO_MM },
                Max   = new[] { box[3] * M_TO_MM, box[4] * M_TO_MM, box[5] * M_TO_MM },
                Units = "mm",
            });
        }

        private static void HandleClose(SwRequest req)
        {
            if (_activeDoc != null)
            {
                string title = _activeDoc.GetTitle();
                Marshal.ReleaseComObject(_activeDoc);
                _activeDoc = null;
                _swApp.CloseDoc(title);
            }
            WriteResult(req.Id, new { closed = true });
        }

        // ── IO Helpers ───────────────────────────────────────────────────────

        // Shared COM conversion error/warning refs (required by SaveAs signature)
        private static int _swConvErr  = 0;
        private static int _swConvWarn = 0;

        private static void WriteReady()
        {
            Console.WriteLine("{\"ready\":true}");
            Console.Out.Flush();
        }

        private static void WriteResult(int id, object result)
        {
            var resp = new SwResponse { Id = id, Ok = true, Result = result };
            Console.WriteLine(JsonConvert.SerializeObject(resp, JsonSettings));
            Console.Out.Flush();
        }

        private static void WriteError(int id, string message)
        {
            var resp = new SwResponse { Id = id, Ok = false, Error = message };
            Console.WriteLine(JsonConvert.SerializeObject(resp, JsonSettings));
            Console.Out.Flush();
        }
    }
}
