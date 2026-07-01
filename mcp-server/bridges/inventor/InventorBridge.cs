/*
 * InventorBridge.cs — COM host for Autodesk Inventor geometry/tree extraction
 *
 * Target: .NET Framework 4.8
 * References:
 *   - Autodesk.Inventor.Interop (from Inventor SDK / GAC registration)
 *   - System.Runtime.InteropServices
 *
 * Protocol: newline-delimited JSON (NDJSON) over stdin/stdout.
 *   Request:  {"id":"req-1","cmd":"open","args":{"filePath":"C:\\part.ipt"}}
 *   Response: {"id":"req-1","ok":true,"data":{...}}
 *   Error:    {"id":"req-1","ok":false,"error":"message"}
 *
 * Build: see README.md in this directory.
 * PRISM milestone: CAD-AUTOMATION-MS0/U-CAUT03
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Inventor;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace PrismInventorBridge
{
    internal class Program
    {
        private static Inventor.Application _app;
        private static Document _activeDoc;

        static int Main(string[] args)
        {
            Console.InputEncoding  = Encoding.UTF8;
            Console.OutputEncoding = Encoding.UTF8;

            try
            {
                _app = StartOrAttachInventor();
                _app.Visible         = false;
                _app.SilentOperation = true;
            }
            catch (Exception ex)
            {
                WriteError("__init__", $"Failed to start Inventor: {ex.Message}");
                return 1;
            }

            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (string.IsNullOrEmpty(line)) continue;

                JObject req;
                try { req = JObject.Parse(line); }
                catch { WriteError("?", "Invalid JSON"); continue; }

                string id  = req["id"]?.Value<string>() ?? "?";
                string cmd = req["cmd"]?.Value<string>() ?? "";
                JObject cmdArgs = (req["args"] as JObject) ?? new JObject();

                try
                {
                    object data = DispatchCommand(cmd, cmdArgs);
                    WriteOk(id, data);
                }
                catch (Exception ex)
                {
                    WriteError(id, ex.Message);
                }
            }

            Cleanup();
            return 0;
        }

        // ── Command Dispatch ───────────────────────────────────────────────

        private static object DispatchCommand(string cmd, JObject args)
        {
            switch (cmd)
            {
                case "open":            return CmdOpen(args);
                case "getParameters":   return CmdGetParameters();
                case "getModelTree":    return CmdGetModelTree();
                case "exportSTEP":      return CmdExportSTEP(args);
                case "getMassProperties": return CmdGetMassProperties();
                case "close":           return CmdClose();
                default:                throw new NotSupportedException($"Unknown command: {cmd}");
            }
        }

        // ── open ──────────────────────────────────────────────────────────

        private static object CmdOpen(JObject args)
        {
            string filePath = args["filePath"]?.Value<string>()
                ?? throw new ArgumentException("args.filePath required");

            if (!File.Exists(filePath))
                throw new FileNotFoundException($"File not found: {filePath}");

            _activeDoc = _app.Documents.Open(filePath, openVisible: false);
            return new { opened = true, filePath };
        }

        // ── getParameters ─────────────────────────────────────────────────

        private static object CmdGetParameters()
        {
            AssertDoc();

            bool isAssembly  = _activeDoc is AssemblyDocument;
            bool isPart      = _activeDoc is PartDocument;
            bool isDrawing   = _activeDoc is DrawingDocument;

            // iProperties ────────────────────────────────────────────────
            var iProps = new List<object>();
            foreach (PropertySet ps in _activeDoc.PropertySets)
            {
                foreach (Property prop in ps)
                {
                    try
                    {
                        iProps.Add(new {
                            set   = ps.Name,
                            name  = prop.Name,
                            value = prop.Value?.ToString() ?? ""
                        });
                    }
                    catch { /* Skip unreadable properties */ }
                }
            }

            // Model parameters (parts only) ───────────────────────────────
            var modelParams = new List<object>();
            bool hasIMate   = false;
            bool hasILogic  = false;
            bool iPartMember    = false;
            bool iAssemblyMember = false;

            if (isPart)
            {
                var partDoc  = (PartDocument)_activeDoc;
                var compDef  = partDoc.ComponentDefinition;

                // iLogic detection
                try { hasILogic = partDoc.RuleManager.Rules.Count > 0; } catch { }

                // iPart detection
                try { iPartMember = compDef.iPartMember; } catch { }

                foreach (Parameter p in compDef.Parameters)
                {
                    bool isKey = false;
                    try { isKey = p.IsKey; } catch { }

                    modelParams.Add(new {
                        name       = p.Name,
                        value      = p.Value,
                        unit       = p.Units,
                        expression = p.Expression ?? "",
                        isKey,
                        isILogic   = false
                    });
                }

                // iMate detection
                try { hasIMate = compDef.iMateDefinitions.Count > 0; } catch { }
            }
            else if (isAssembly)
            {
                var asmDoc = (AssemblyDocument)_activeDoc;
                var compDef = asmDoc.ComponentDefinition;
                try { iAssemblyMember = compDef.iAssemblyMember; } catch { }
                try { hasIMate = compDef.iMateDefinitions.Count > 0; } catch { }
                try { hasILogic = asmDoc.RuleManager.Rules.Count > 0; } catch { }
            }

            // Extract well-known iProperties safely
            string partNumber = GetIProp("Design Tracking Properties", "Part Number");
            string revision   = GetIProp("Design Tracking Properties", "Revision Number");
            string material   = GetIProp("Project", "Material");

            return new {
                modelParameters  = modelParams,
                iProperties      = iProps,
                iAssemblyMember,
                iPartMember,
                hasIMate,
                hasILogic,
                partNumber,
                revision,
                material
            };
        }

        // ── getModelTree ──────────────────────────────────────────────────

        private static object CmdGetModelTree()
        {
            AssertDoc();

            string fileType = "unknown";
            var features    = new List<object>();
            var components  = new List<string>();

            if (_activeDoc is PartDocument partDoc)
            {
                fileType = "ipt";
                foreach (PartFeature f in partDoc.ComponentDefinition.Features)
                {
                    features.Add(SerializeFeature(f));
                }
            }
            else if (_activeDoc is AssemblyDocument asmDoc)
            {
                fileType = "iam";
                foreach (ComponentOccurrence occ in asmDoc.ComponentDefinition.Occurrences)
                {
                    components.Add(occ.Name);
                }
            }
            else if (_activeDoc is DrawingDocument)
            {
                fileType = "idw";
            }

            return new {
                rootName     = Path.GetFileNameWithoutExtension(_activeDoc.FullFileName),
                fileType,
                featureCount = features.Count,
                features,
                components
            };
        }

        // ── exportSTEP ────────────────────────────────────────────────────

        private static object CmdExportSTEP(JObject args)
        {
            AssertDoc();
            string outputPath = args["outputPath"]?.Value<string>()
                ?? throw new ArgumentException("args.outputPath required");

            // AP214 is the default for Inventor STEP exports; AP242 available via options
            var options = _app.FileManager.GetSaveAsOptions(outputPath);
            _activeDoc.SaveAs(outputPath, saveOptions: options);

            return new { exported = true, outputPath, format = "AP214" };
        }

        // ── getMassProperties ─────────────────────────────────────────────

        private static object CmdGetMassProperties()
        {
            AssertDoc();

            MassProperties mp;
            if (_activeDoc is PartDocument pd)
                mp = pd.ComponentDefinition.MassProperties;
            else if (_activeDoc is AssemblyDocument ad)
                mp = ad.ComponentDefinition.MassProperties;
            else
                throw new NotSupportedException("Mass properties only available for parts and assemblies");

            var com = mp.CenterOfMass;
            var moi = mp.PrincipalMomentsOfInertia; // kg·mm² about principal axes

            return new {
                mass             = mp.Mass,
                volume           = mp.Volume,
                centerOfMass     = new double[] { com.X, com.Y, com.Z },
                momentsOfInertia = new {
                    Ixx = moi.X, Iyy = moi.Y, Izz = moi.Z,
                    Ixy = 0.0, Iyz = 0.0, Ixz = 0.0   // principal axes; products of inertia = 0
                },
                densityUsed = mp.Density
            };
        }

        // ── close ─────────────────────────────────────────────────────────

        private static object CmdClose()
        {
            if (_activeDoc != null)
            {
                _activeDoc.Close(skipSave: true);
                _activeDoc = null;
            }
            return new { closed = true };
        }

        // ── Helpers ───────────────────────────────────────────────────────

        private static void AssertDoc()
        {
            if (_activeDoc == null)
                throw new InvalidOperationException("No document open. Call 'open' first.");
        }

        private static object SerializeFeature(PartFeature f)
        {
            string health = "unknown";
            try
            {
                health = f.HealthStatus == HealthStatusEnum.kUpToDateHealthStatus ? "healthy"
                       : f.HealthStatus == HealthStatusEnum.kWarningHealthStatus  ? "warning"
                       : f.HealthStatus == HealthStatusEnum.kErroredHealthStatus  ? "error"
                       : "unknown";
            }
            catch { }

            return new {
                index         = f.Index,
                name          = f.Name,
                type          = f.GetType().Name.Replace("Feature", ""),
                suppressed    = f.Suppressed,
                healthStatus  = health,
                children      = new object[0]
            };
        }

        private static string GetIProp(string setName, string propName)
        {
            try
            {
                return _activeDoc.PropertySets[setName][propName].Value?.ToString() ?? "";
            }
            catch { return ""; }
        }

        private static Inventor.Application StartOrAttachInventor()
        {
            // Try to attach to a running instance first
            try
            {
                return (Inventor.Application)Marshal.GetActiveObject("Inventor.Application");
            }
            catch (COMException)
            {
                // Not running — start a new instance
                var type = Type.GetTypeFromProgID("Inventor.Application")
                    ?? throw new InvalidOperationException("Inventor is not installed (ProgID not found)");
                return (Inventor.Application)Activator.CreateInstance(type);
            }
        }

        private static void Cleanup()
        {
            try { _activeDoc?.Close(skipSave: true); } catch { }
            try { if (_app != null) { _app.Quit(); Marshal.ReleaseComObject(_app); } } catch { }
        }

        // ── NDJSON helpers ────────────────────────────────────────────────

        private static void WriteOk(string id, object data)
        {
            var resp = new { id, ok = true, data };
            Console.WriteLine(JsonConvert.SerializeObject(resp, Formatting.None));
        }

        private static void WriteError(string id, string error)
        {
            var resp = new { id, ok = false, error };
            Console.WriteLine(JsonConvert.SerializeObject(resp, Formatting.None));
        }
    }
}
