// MastercamNetHook.cs — PRISM in-process NET-Hook bridge for Mastercam
//
// Build: .NET Framework 4.8 Class Library (x64).
// Loaded by Mastercam.exe at startup via the -runchook command-line argument:
//
//   Mastercam.exe -runchook "C:\ProgramData\PRISM\bridges\MastercamNetHook.dll"
//
// The DLL must reference the Mastercam API assemblies from the Mastercam install
// directory (see References section in the accompanying .csproj / README).
//
// Protocol: newline-delimited JSON on a named pipe.
//   Pipe name: \\.\pipe\prism-mcam-{pid}  (pid = Mastercam process ID)
//   Commands:  { "id":"...", "cmd":"open|getGeometry|getToolpaths|getOperationTree|exportSTEP|close", "args":{...} }
//   Responses: { "id":"...", "ok":true|false, "data":{...}, "error":"..." }
//
// Mastercam API assembly references required (adjust paths to your install):
//   %MASTERCAM_DIR%\Mastercam.IO.dll
//   %MASTERCAM_DIR%\Mastercam.Database.dll
//   %MASTERCAM_DIR%\Mastercam.Curves.dll
//   %MASTERCAM_DIR%\Mastercam.Support.dll
//   %MASTERCAM_DIR%\Mastercam.App.dll
//   %MASTERCAM_DIR%\Mastercam.Operations.dll

using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Pipes;
using System.Runtime.Serialization.Json;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;

// ── Mastercam API namespaces ───────────────────────────────────────────────────
using Mastercam.App;
using Mastercam.Database;
using Mastercam.IO;
using Mastercam.IO.Types;
using Mastercam.Math;
using Mastercam.Support;

namespace PRISM.Bridges.Mastercam
{
    // ─────────────────────────────────────────────────────────────────────────
    // NET-Hook entrypoint — Mastercam loads this via -runchook
    // ─────────────────────────────────────────────────────────────────────────
    public class NetHook : NetHookBase
    {
        private PrismPipeServer _server;

        /// <summary>
        /// Called by Mastercam after the API is fully initialized.
        /// Starts the named-pipe server and blocks until a "close" command is received.
        /// </summary>
        public override bool Run()
        {
            try
            {
                int pid = System.Diagnostics.Process.GetCurrentProcess().Id;
                string pipeName = $"prism-mcam-{pid}";

                _server = new PrismPipeServer(pipeName);
                _server.Run(); // blocks until close command
                return true;
            }
            catch (Exception ex)
            {
                // Write to Mastercam message window if possible; then propagate
                try { MCMessageBox.ShowBulletin($"PRISM NetHook error: {ex.Message}", "PRISM"); }
                catch { /* ignore if UI unavailable */ }
                return false;
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Named-pipe server — handles one client connection per session
    // ─────────────────────────────────────────────────────────────────────────
    internal class PrismPipeServer
    {
        private readonly string _pipeName;
        private readonly JavaScriptSerializer _json = new JavaScriptSerializer();
        private volatile bool _running = true;

        public PrismPipeServer(string pipeName)
        {
            _pipeName = pipeName;
        }

        /// <summary>Blocks until a "close" command is received or the pipe breaks.</summary>
        public void Run()
        {
            using (var pipe = new NamedPipeServerStream(
                _pipeName,
                PipeDirection.InOut,
                1,                         // max server instances
                PipeTransmissionMode.Byte,
                PipeOptions.Asynchronous))
            {
                pipe.WaitForConnection();

                using (var reader = new StreamReader(pipe, Encoding.UTF8, false, 4096, true))
                using (var writer = new StreamWriter(pipe, Encoding.UTF8, 4096, true) { AutoFlush = true })
                {
                    string line;
                    while (_running && (line = reader.ReadLine()) != null)
                    {
                        if (string.IsNullOrWhiteSpace(line)) continue;

                        PipeResponse response;
                        try
                        {
                            var cmd = _json.Deserialize<PipeCommand>(line);
                            response = HandleCommand(cmd);
                            if (cmd.cmd == "close") _running = false;
                        }
                        catch (Exception ex)
                        {
                            response = new PipeResponse { id = "?", ok = false, error = ex.Message };
                        }

                        writer.WriteLine(_json.Serialize(response));
                        if (!_running) break;
                    }
                }
            }
        }

        // ── Command dispatcher ────────────────────────────────────────────────

        private PipeResponse HandleCommand(PipeCommand cmd)
        {
            switch (cmd.cmd)
            {
                case "open":           return CmdOpen(cmd);
                case "getGeometry":    return CmdGetGeometry(cmd);
                case "getToolpaths":   return CmdGetToolpaths(cmd);
                case "getOperationTree": return CmdGetOperationTree(cmd);
                case "exportSTEP":     return CmdExportSTEP(cmd);
                case "close":          return Ok(cmd.id, new { closed = true });
                default:
                    return Err(cmd.id, $"Unknown command: {cmd.cmd}");
            }
        }

        // ── open ──────────────────────────────────────────────────────────────

        private PipeResponse CmdOpen(PipeCommand cmd)
        {
            try
            {
                string filePath = cmd.args.ContainsKey("filePath")
                    ? cmd.args["filePath"].ToString()
                    : throw new ArgumentException("args.filePath required");

                if (!File.Exists(filePath))
                    return Err(cmd.id, $"File not found: {filePath}");

                var result = FileManager.Open(filePath);
                if (!result)
                    return Err(cmd.id, $"FileManager.Open returned false for: {filePath}");

                string ext = Path.GetExtension(filePath);
                return Ok(cmd.id, new { filePath, format = ext, opened = true });
            }
            catch (Exception ex)
            {
                return Err(cmd.id, ex.Message);
            }
        }

        // ── getGeometry ───────────────────────────────────────────────────────

        private PipeResponse CmdGetGeometry(PipeCommand cmd)
        {
            try
            {
                var entities = SearchManager.GetGeometry();
                var lines   = new List<object>();
                var arcs    = new List<object>();
                var splines = new List<object>();
                var surfaces = new List<object>();
                int total   = 0;

                foreach (var ent in entities)
                {
                    total++;
                    var info = new
                    {
                        type  = ent.Type.ToString().ToLowerInvariant(),
                        id    = ent.Handle,
                        layer = ent.Level,
                        color = ent.Color,
                    };

                    switch (ent.Type)
                    {
                        case EntityType.Line:    lines.Add(info);    break;
                        case EntityType.Arc:     arcs.Add(info);     break;
                        case EntityType.Spline:  splines.Add(info);  break;
                        case EntityType.Surface: surfaces.Add(info); break;
                        // Points and other geometry silently counted in total
                    }
                }

                return Ok(cmd.id, new
                {
                    lines,
                    arcs,
                    splines,
                    surfaces,
                    totalEntities = total,
                });
            }
            catch (Exception ex)
            {
                return Err(cmd.id, ex.Message);
            }
        }

        // ── getToolpaths ──────────────────────────────────────────────────────

        private PipeResponse CmdGetToolpaths(PipeCommand cmd)
        {
            // Delegate to getOperationTree and flatten
            var treeResp = CmdGetOperationTree(cmd);
            if (!treeResp.ok) return treeResp;

            // The NodeJS host flattens internally; return tree and let host flatten
            return treeResp;
        }

        // ── getOperationTree ──────────────────────────────────────────────────

        private PipeResponse CmdGetOperationTree(PipeCommand cmd)
        {
            try
            {
                var machineGroups = new List<object>();
                int totalOps = 0;

                // Enumerate all machine groups in the document
                var mgList = OperationManager.GetOperations(true);

                // Group operations by machine group (NCI group)
                var byGroup = new Dictionary<string, List<object>>();
                var groupMeta = new Dictionary<string, object>();

                foreach (var op in mgList)
                {
                    if (op == null) continue;

                    string mgKey = op.GroupName ?? "Machine Group 1";

                    if (!byGroup.ContainsKey(mgKey))
                    {
                        byGroup[mgKey] = new List<object>();
                        groupMeta[mgKey] = new
                        {
                            name       = mgKey,
                            controller = op.Machine?.ControllerType ?? "Unknown",
                            post       = op.Machine?.PostProcessor ?? "Unknown",
                        };
                    }

                    byGroup[mgKey].Add(new
                    {
                        index         = totalOps,
                        name          = op.Name ?? $"Operation_{totalOps}",
                        cycleCode     = op.OperationType.ToString(),
                        toolDiameter_mm = op.Tool?.Diameter ?? 0.0,
                        toolType      = op.Tool?.ToolType.ToString().ToLowerInvariant() ?? "unknown",
                        spindleRpm    = (int)(op.Parameters?.SpindleSpeed ?? 0),
                        feedRate_mmpm = op.Parameters?.FeedRate ?? 0.0,
                        isEnabled     = op.Selected,
                        isDirty       = op.Dirty,
                    });
                    totalOps++;
                }

                foreach (var kvp in byGroup)
                {
                    var meta = groupMeta[kvp.Key] as dynamic;
                    machineGroups.Add(new
                    {
                        name       = kvp.Key,
                        controller = (string)((dynamic)groupMeta[kvp.Key]).controller,
                        postProcessor = (string)((dynamic)groupMeta[kvp.Key]).post,
                        toolpathGroups = new[]
                        {
                            new { name = "All Operations", operations = kvp.Value }
                        },
                    });
                }

                return Ok(cmd.id, new
                {
                    machineGroups,
                    totalOperations = totalOps,
                });
            }
            catch (Exception ex)
            {
                return Err(cmd.id, ex.Message);
            }
        }

        // ── exportSTEP ────────────────────────────────────────────────────────

        private PipeResponse CmdExportSTEP(PipeCommand cmd)
        {
            try
            {
                string outputPath = cmd.args.ContainsKey("outputPath")
                    ? cmd.args["outputPath"].ToString()
                    : throw new ArgumentException("args.outputPath required");

                string dir = Path.GetDirectoryName(outputPath);
                if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
                    Directory.CreateDirectory(dir);

                // Use Mastercam FileManager to export as STEP AP242
                var exportResult = FileManager.SaveAs(outputPath, FileExtensions.Step);
                if (!exportResult)
                    return Err(cmd.id, $"STEP export failed for: {outputPath}");

                return Ok(cmd.id, new { outputPath, format = "STEP AP242", exported = true });
            }
            catch (Exception ex)
            {
                return Err(cmd.id, ex.Message);
            }
        }

        // ── Helpers ───────────────────────────────────────────────────────────

        private PipeResponse Ok(string id, object data) =>
            new PipeResponse { id = id, ok = true, data = data };

        private PipeResponse Err(string id, string error) =>
            new PipeResponse { id = id, ok = false, error = error };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Protocol types (serialized/deserialized as plain JSON objects)
    // ─────────────────────────────────────────────────────────────────────────

    internal class PipeCommand
    {
        public string id   { get; set; }
        public string cmd  { get; set; }
        /// <summary>Arbitrary key-value args. Deserialized as Dictionary for flexibility.</summary>
        public Dictionary<string, object> args { get; set; } = new Dictionary<string, object>();
    }

    internal class PipeResponse
    {
        public string id    { get; set; }
        public bool   ok    { get; set; }
        public object data  { get; set; }
        public string error { get; set; }
    }
}
