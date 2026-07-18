// PrismWinMaxShim — JSON-over-stdio WCF client for WinMax's net.tcp:4502 IDataService.
// slot:echo, 2026-05-30. Bridges WinMax's .NET-binary net.tcp WCF to scripts/winmax-bridge.mjs.
//
// Modes:
//   --op <Name> [args...]   one-shot: dispatch one op, print one JSON line, exit.
//   --serve                 long-running: read {"op","args"} JSON lines on stdin, write JSON
//                           result lines on stdout (one per request). "__quit__" ends the loop.
//
// Flags:
//   --endpoint <uri>    default net.tcp://localhost:4502/DataServicetcp
//   --security none|transport   net.tcp security mode (default none — localhost desktop sim)
//   --allow-motion      enable mutating/motion ops (operator-supervised). OFF by default.
//
// SAFETY (R12): read ops are always allowed; mutating/motion ops (machine movement, SID writes)
// are REFUSED unless --allow-motion is present. The shim only connects to an already-running
// WinMax stack — it NEVER launches WinMaxMill.exe / CNC_RT.exe.

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.ServiceModel;
using System.Text.Json;
using System.Threading.Tasks;
using PRISM.WinMax.Wcf;

namespace PRISM.WinMax.Shim
{
    internal static class Program
    {
        // Ops that mutate machine state or physically move the machine — gated behind --allow-motion.
        private static readonly HashSet<string> Mutating = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "SetSID", "SetIntSID", "SetDoubleSID", "SetBulk",
            "RemoteRapidMove", "WirelessJog", "ProcessCommandRequest",
        };

        private static readonly JsonSerializerOptions J = new JsonSerializerOptions { WriteIndented = false };

        private static async Task<int> Main(string[] args)
        {
            string endpoint = "net.tcp://localhost:4502/DataServicetcp";
            // The live DataServicetcp endpoint uses SecurityMode.Message + MessageCredentialType.UserName
            // (custom VendorIdValidator) per WcfDataService.exe.config — proven 2026-05-30. Default to that.
            string security = "message";
            string user = Environment.GetEnvironmentVariable("WINMAX_VENDOR_ID") ?? "";
            string pass = Environment.GetEnvironmentVariable("WINMAX_VENDOR_SECRET") ?? "";
            // The server cert (cer.pfx) claims DNS identity machine-connect.hurco.com, not localhost,
            // so message security needs it set explicitly on the EndpointAddress (proven 2026-05-30).
            string dns = Environment.GetEnvironmentVariable("WINMAX_DNS_IDENTITY") ?? "machine-connect.hurco.com";
            bool allowMotion = false;
            bool serve = false;
            string op = null;
            var rest = new List<string>();

            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--endpoint": endpoint = NextArg(args, ref i); break;
                    case "--security": security = NextArg(args, ref i); break;
                    case "--user": user = NextArg(args, ref i); break;
                    case "--pass": pass = NextArg(args, ref i); break;
                    case "--dns-identity": dns = NextArg(args, ref i); break;
                    case "--allow-motion": allowMotion = true; break;
                    case "--serve": serve = true; break;
                    case "--op": op = NextArg(args, ref i); break;
                    default: rest.Add(args[i]); break;
                }
            }

            DataServiceClient client;
            try { client = MakeClient(endpoint, security, user, pass, dns); }
            catch (Exception e) { Console.WriteLine(JsonErr("connect", e.GetType().Name + ": " + e.Message)); return 2; }

            try
            {
                if (serve) return await Serve(client, allowMotion);
                Console.WriteLine(await Dispatch(client, op ?? "GetVersion", rest.ToArray(), allowMotion));
                return 0;
            }
            finally
            {
                try { client.Abort(); } catch { /* best-effort close */ }
            }
        }

        private static string NextArg(string[] args, ref int i) => (i + 1 < args.Length) ? args[++i] : "";

        private static DataServiceClient MakeClient(string endpoint, string security, string user, string pass, string dns)
        {
            bool message = security.Equals("message", StringComparison.OrdinalIgnoreCase);
            var mode = message ? SecurityMode.Message
                : security.Equals("transport", StringComparison.OrdinalIgnoreCase) ? SecurityMode.Transport
                : SecurityMode.None;

            var b = new NetTcpBinding(mode)
            {
                TransferMode = TransferMode.Buffered,
                MaxReceivedMessageSize = 64L * 1024 * 1024,
                MaxBufferSize = 64 * 1024 * 1024,
                OpenTimeout = TimeSpan.FromSeconds(15),
                CloseTimeout = TimeSpan.FromSeconds(10),
                SendTimeout = TimeSpan.FromSeconds(30),
                ReceiveTimeout = TimeSpan.FromSeconds(30),
            };
            if (message)
                b.Security.Message.ClientCredentialType = MessageCredentialType.UserName;

            // Message security validates the server cert's DNS identity against the EndpointAddress
            // identity; the cert claims machine-connect.hurco.com, so set it explicitly when provided.
            var address = (message && !string.IsNullOrEmpty(dns))
                ? new EndpointAddress(new Uri(endpoint), new DnsEndpointIdentity(dns))
                : new EndpointAddress(endpoint);
            var client = new DataServiceClient(b, address);
            if (message)
            {
                // VendorId username/password the service's custom validator (VendorIdValidatorReadWrite) checks.
                client.ClientCredentials.UserName.UserName = user ?? "";
                client.ClientCredentials.UserName.Password = pass ?? "";
                // The server presents a self-signed (and possibly expired) cert (cer.pfx, subject
                // *.hurco.com) negotiated at the MESSAGE layer. The validation knob for a message-
                // negotiated service cert is ServiceCertificate.Authentication (NOT SslCertificate-
                // Authentication, which is transport/SSL only). Trust it for the localhost desktop sim.
                var sc = client.ClientCredentials.ServiceCertificate;
                sc.Authentication.CertificateValidationMode = System.ServiceModel.Security.X509CertificateValidationMode.None;
                sc.Authentication.RevocationMode = System.Security.Cryptography.X509Certificates.X509RevocationMode.NoCheck;
                sc.SslCertificateAuthentication = new System.ServiceModel.Security.X509ServiceCertificateAuthentication
                {
                    CertificateValidationMode = System.ServiceModel.Security.X509CertificateValidationMode.None,
                    RevocationMode = System.Security.Cryptography.X509Certificates.X509RevocationMode.NoCheck,
                };
            }
            return client;
        }

        private static async Task<int> Serve(DataServiceClient client, bool allowMotion)
        {
            string line;
            while ((line = Console.ReadLine()) != null)
            {
                line = line.Trim();
                if (line.Length == 0) continue;
                if (line == "__quit__") break;

                string op;
                string[] a;
                try
                {
                    using var doc = JsonDocument.Parse(line);
                    op = doc.RootElement.GetProperty("op").GetString();
                    a = doc.RootElement.TryGetProperty("args", out var av) && av.ValueKind == JsonValueKind.Array
                        ? av.EnumerateArray().Select(ToArgString).ToArray()
                        : Array.Empty<string>();
                }
                catch (Exception e) { Console.WriteLine(JsonErr("parse", e.GetType().Name + ": " + e.Message)); continue; }

                Console.WriteLine(await Dispatch(client, op, a, allowMotion));
            }
            return 0;
        }

        private static string ToArgString(JsonElement e) =>
            e.ValueKind == JsonValueKind.String ? e.GetString() : e.GetRawText();

        // Read-only ops are always served. Mutating/motion ops require allowMotion.
        private static async Task<string> Dispatch(DataServiceClient c, string op, string[] a, bool allowMotion)
        {
            if (op == null) return JsonErr("(null)", "no op specified");
            if (Mutating.Contains(op) && !allowMotion)
                return JsonErr(op, "refused: mutating/motion op requires --allow-motion (operator-supervised). Read-only by default (R12 safety).");

            try
            {
                switch (op)
                {
                    case "GetVersion": return Ok(op, await c.GetVersionAsync());
                    case "GetServerVersion": return Ok(op, await c.GetServerVersionAsync());
                    case "GetClock": return Ok(op, await c.GetClockAsync());
                    case "StringToGID": return Ok(op, await c.StringToGIDAsync(Arg(a, 0)));
                    case "GetIntSID": return Ok(op, await c.GetIntSIDAsync(Arg(a, 0)));
                    case "GetDoubleSID": return Ok(op, await c.GetDoubleSIDAsync(Arg(a, 0)));
                    case "GetSID":
                    {
                        var v = await c.GetSIDAsync(Arg(a, 0));
                        return Ok(op, v == null ? null : new { v.SID, v.Since, v.Value });
                    }
                    case "GetBulkByXML":
                    {
                        var xml = await c.GetBulkByXMLAsync(Arg(a, 0));
                        return Ok(op, xml == null ? null : xml.OuterXml);
                    }
                    case "GetChangedSIDs": return Ok(op, await c.GetChangedSIDsAsync(Arg(a, 0)));
                    case "GetCurrentGraphicsProgram":
                    {
                        using var s = await c.GetCurrentGraphicsProgramAsync();
                        using var ms = new MemoryStream();
                        if (s != null) await s.CopyToAsync(ms);
                        var bytes = ms.ToArray();
                        return Ok(op, new { length = bytes.Length, base64 = Convert.ToBase64String(bytes) });
                    }
                    case "DownloadFile":
                    {
                        using var s = await c.DownloadFileAsync(Arg(a, 0));
                        using var ms = new MemoryStream();
                        if (s != null) await s.CopyToAsync(ms);
                        var bytes = ms.ToArray();
                        return Ok(op, new { fileName = Arg(a, 0), length = bytes.Length, base64 = Convert.ToBase64String(bytes) });
                    }

                    // ── mutating/motion (only reachable when allowMotion) ──
                    case "SetIntSID": await c.SetIntSIDAsync(Arg(a, 0), int.Parse(Arg(a, 1))); return Ok(op, true);
                    case "SetDoubleSID": await c.SetDoubleSIDAsync(Arg(a, 0), double.Parse(Arg(a, 1))); return Ok(op, true);

                    default: return JsonErr(op, "unknown or unsupported op");
                }
            }
            catch (Exception e) { return JsonErr(op, Flatten(e)); }
        }

        private static string Arg(string[] a, int i) => (a != null && i < a.Length) ? a[i] : "";
        private static string Ok(string op, object value) => JsonSerializer.Serialize(new { ok = true, op, value }, J);
        private static string JsonErr(string op, string msg) => JsonSerializer.Serialize(new { ok = false, op, error = msg }, J);

        // Flatten an exception chain so the actual cause (e.g. a credential rejection nested under a
        // SecurityNegotiationException) is visible in the JSON, not hidden behind "See inner exception".
        private static string Flatten(Exception e)
        {
            var sb = new System.Text.StringBuilder();
            for (var x = e; x != null; x = x.InnerException)
            {
                if (sb.Length > 0) sb.Append(" <- ");
                sb.Append(x.GetType().Name).Append(": ").Append(x.Message);
            }
            return sb.ToString();
        }
    }
}
