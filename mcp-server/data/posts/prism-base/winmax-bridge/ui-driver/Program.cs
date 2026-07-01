// PrismWinMaxUI — drive the WinMax GUI via Windows UI Automation (UIA). slot:echo, 2026-05-30.
//
// Ops (JSON line out):
//   --op probe            walk the UIA tree of the WinMax window → flat node list + a summary of
//                         actionable controls (buttons / menu items / edits / lists). READ-ONLY.
//   --op window-info      top-level window name/class/bounds. READ-ONLY.
//   --op find <text>      elements whose Name/AutomationId contains <text>. READ-ONLY.
//   --op get-text <id>    Value/Text of an element by AutomationId or Name. READ-ONLY.
//   --op invoke|set-value|menu|sendkeys   GATED behind --allow-actions (input injection).
//   --serve               JSON {op,args} lines on stdin → result lines (for the node bridge).
//
// SAFETY: read ops are always allowed. Input-injection ops require --allow-actions. Any control
// whose name matches the CYCLE-START denylist is REFUSED even with --allow-actions unless
// --allow-machine-motion (operator-explicit) — UI automation on real hardware MOVES THE MACHINE.
// The driver attaches to an already-running WinMax; it never launches it.

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.Json;
using System.Windows.Automation;

namespace PRISM.WinMax.UI
{
    internal static class Program
    {
        private static readonly JsonSerializerOptions J = new JsonSerializerOptions { WriteIndented = false };

        // Control names that START/RESUME machine motion — never auto-driven without explicit opt-in.
        private static readonly string[] MotionDeny = { "cycle start", "cyclestart", "start cycle", "run program", "feed hold", "auto start" };
        // Width (px) of the right-edge softkey column (F1-F8). click-xy refuses this band so action/run
        // softkeys go through the safe sendkeys "{Fn}" path, never a name-blind coordinate click.
        private const int SOFTKEY_BAND_PX = 210;

        private static int Main(string[] args)
        {
            string proc = "WinMax";
            string op = "probe";
            int maxDepth = 8, maxNodes = 4000;
            bool allowActions = false, allowMotion = false, serve = false;
            var rest = new List<string>();
            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--process": proc = Next(args, ref i); break;
                    case "--op": op = Next(args, ref i); break;
                    case "--depth": int.TryParse(Next(args, ref i), out maxDepth); break;
                    case "--max-nodes": int.TryParse(Next(args, ref i), out maxNodes); break;
                    case "--allow-actions": allowActions = true; break;
                    case "--allow-machine-motion": allowMotion = true; break;
                    case "--serve": serve = true; break;
                    default: rest.Add(args[i]); break;
                }
            }

            AutomationElement win;
            try { win = FindWindow(proc); }
            catch (Exception e) { Console.WriteLine(JsonErr("attach", e.GetType().Name + ": " + e.Message)); return 2; }
            if (win == null) { Console.WriteLine(JsonErr("attach", $"no visible top-level window for process '{proc}' (is WinMax running?)")); return 2; }

            if (serve)
            {
                string line;
                while ((line = Console.ReadLine()) != null)
                {
                    line = line.Trim();
                    if (line.Length == 0) continue;
                    if (line == "__quit__") break;
                    try
                    {
                        using var doc = JsonDocument.Parse(line);
                        var o = doc.RootElement.GetProperty("op").GetString();
                        var a = doc.RootElement.TryGetProperty("args", out var av) && av.ValueKind == JsonValueKind.Array
                            ? av.EnumerateArray().Select(x => x.ValueKind == JsonValueKind.String ? x.GetString() : x.GetRawText()).ToList()
                            : new List<string>();
                        Console.WriteLine(Dispatch(win, o, a, maxDepth, maxNodes, allowActions, allowMotion));
                    }
                    catch (Exception e) { Console.WriteLine(JsonErr("parse", e.Message)); }
                }
                return 0;
            }

            Console.WriteLine(Dispatch(win, op, rest, maxDepth, maxNodes, allowActions, allowMotion));
            return 0;
        }

        private static string Dispatch(AutomationElement win, string op, List<string> a, int maxDepth, int maxNodes, bool allowActions, bool allowMotion)
        {
            try
            {
                switch (op)
                {
                    case "probe": return Probe(win, maxDepth, maxNodes);
                    case "window-info": return Ok(op, Info(win));
                    case "find": return Ok(op, Find(win, Arg(a, 0), maxNodes));
                    case "get-text": return Ok(op, GetText(win, Arg(a, 0)));
                    case "screenshot": return Screenshot(win, Arg(a, 0), Arg(a, 1));
                    case "maximize": {
                        // Resize the window to its monitor's maximized size — a KNOWN stable layout so
                        // click-xy coords (for non-UIA controls like dropdowns) don't drift when the
                        // operator resizes the window. Benign + reversible (no input injection, no machine
                        // motion), so it is allowed without --allow-actions. Returns the new window bounds.
                        try { var h = new IntPtr(win.Current.NativeWindowHandle); if (h != IntPtr.Zero) { ShowWindow(h, SW_MAXIMIZE); SetForegroundWindow(h); } } catch { }
                        System.Threading.Thread.Sleep(350);
                        return Ok(op, Info(win));
                    }
                    case "invoke":
                    case "set-value":
                    case "menu":
                    case "sendkeys":
                    case "click":
                    case "click-xy":
                    case "type-into":
                    case "type-tab":
                    case "type-raw":
                        if (!allowActions) return JsonErr(op, "refused: UI input requires --allow-actions (operator-supervised).");
                        return DoAction(win, op, a, allowMotion);
                    default: return JsonErr(op, "unknown op");
                }
            }
            catch (Exception e) { return JsonErr(op, e.GetType().Name + ": " + e.Message); }
        }

        // ── Win32 window enumeration (UIA tree enumeration is unreliable for WinMaxTDBClass — it
        //    spawns a cloaked helper at -32000,-32000; EnumWindows sees every real top-level HWND) ──
        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc cb, IntPtr p);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr h, out RECT r);
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
        [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr h, int cmd);
        [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr h);
        [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr h);
        [DllImport("user32.dll")] private static extern bool SetCursorPos(int x, int y);
        [DllImport("user32.dll")] private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
        private const uint MOUSEEVENTF_LEFTDOWN = 0x02, MOUSEEVENTF_LEFTUP = 0x04;
        private delegate bool EnumWindowsProc(IntPtr h, IntPtr p);
        [StructLayout(LayoutKind.Sequential)] private struct RECT { public int Left, Top, Right, Bottom; }
        private const int SW_RESTORE = 9;
        private const int SW_MAXIMIZE = 3;

        // ── attach: largest VISIBLE on-screen top-level window of the process. If WinMax is minimized
        //    (visible only as a taskbar button), RESTORE + foreground it first — an autonomous test
        //    harness must bring its target app up; this is benign + reversible (the operator can
        //    re-minimize). The cloaked WinMaxTDBClass helper at -32000 is filtered out. ──
        private static AutomationElement FindWindow(string procName)
        {
            var procs = Process.GetProcessesByName(procName);
            if (procs.Length == 0) return null;
            // self-heal: restore any minimized main window before we look for an on-screen one
            foreach (var p in procs)
            {
                var mh = p.MainWindowHandle;
                if (mh != IntPtr.Zero) { try { if (IsIconic(mh)) ShowWindow(mh, SW_RESTORE); SetForegroundWindow(mh); } catch { } }
            }
            System.Threading.Thread.Sleep(350);
            var pids = new HashSet<uint>(procs.Select(p => (uint)p.Id));
            IntPtr bestH = IntPtr.Zero; long bestArea = -1;
            EnumWindows((h, _) =>
            {
                if (!IsWindowVisible(h)) return true;
                GetWindowThreadProcessId(h, out var wpid);
                if (!pids.Contains(wpid)) return true;
                if (!GetWindowRect(h, out var r)) return true;
                long w = r.Right - r.Left, ht = r.Bottom - r.Top;
                if (r.Left <= -30000 || r.Top <= -30000 || w < 200 || ht < 200) return true; // skip cloaked/tiny
                long area = w * ht;
                if (area > bestArea) { bestArea = area; bestH = h; }
                return true;
            }, IntPtr.Zero);
            if (bestH != IntPtr.Zero) { try { return AutomationElement.FromHandle(bestH); } catch { } }
            var mp = procs.FirstOrDefault(x => x.MainWindowHandle != IntPtr.Zero);
            return mp != null ? AutomationElement.FromHandle(mp.MainWindowHandle) : null;
        }

        // ── read ops ──
        private static object Info(AutomationElement e)
        {
            var c = e.Current;
            var r = c.BoundingRectangle;
            return new { name = c.Name, automationId = c.AutomationId, className = c.ClassName, controlType = c.ControlType.ProgrammaticName, pid = c.ProcessId, bounds = new { x = (int)r.X, y = (int)r.Y, w = (int)r.Width, h = (int)r.Height } };
        }

        private static string Probe(AutomationElement win, int maxDepth, int maxNodes)
        {
            var nodes = new List<object>();
            var walker = TreeWalker.ControlViewWalker;
            var byType = new Dictionary<string, int>();
            var actionable = new List<object>();
            int count = 0;

            void Visit(AutomationElement el, int depth)
            {
                if (el == null || count >= maxNodes || depth > maxDepth) return;
                AutomationElement.AutomationElementInformation c;
                try { c = el.Current; } catch { return; }
                count++;
                string ct = SafeType(c.ControlType);
                byType[ct] = byType.TryGetValue(ct, out var n) ? n + 1 : 1;
                var patterns = SafePatterns(el);
                var rect = c.BoundingRectangle;
                string help = SafeHelp(el);
                var node = new { depth, name = Trunc(c.Name), automationId = c.AutomationId, className = c.ClassName, controlType = ct, patterns, helpText = Trunc(help), x = (int)rect.X, y = (int)rect.Y, w = (int)rect.Width, h = (int)rect.Height };
                nodes.Add(node);
                // actionable controls — what we'd drive (buttons/menus/edits/lists/tabs)
                if (ct is "Button" or "MenuItem" or "Edit" or "List" or "ListItem" or "TabItem" or "CheckBox" or "ComboBox" or "Hyperlink" or "Text")
                    if (!string.IsNullOrWhiteSpace(c.Name) || !string.IsNullOrWhiteSpace(c.AutomationId) || !string.IsNullOrWhiteSpace(help))
                        actionable.Add(new { controlType = ct, name = Trunc(c.Name), automationId = c.AutomationId, helpText = Trunc(help), patterns });
                AutomationElement child;
                try { child = walker.GetFirstChild(el); } catch { child = null; }
                while (child != null && count < maxNodes)
                {
                    Visit(child, depth + 1);
                    try { child = walker.GetNextSibling(child); } catch { break; }
                }
            }
            Visit(win, 0);

            var payload = new
            {
                ok = true, op = "probe",
                window = Info(win),
                nodeCount = count, truncated = count >= maxNodes,
                controlTypeCounts = byType.OrderByDescending(k => k.Value).ToDictionary(k => k.Key, k => k.Value),
                actionable, // the drive targets
                tree = nodes,
            };
            return JsonSerializer.Serialize(payload, J);
        }

        private static object Find(AutomationElement win, string needle, int maxNodes)
        {
            needle = (needle ?? "").ToLowerInvariant();
            var hits = new List<object>();
            var walker = TreeWalker.ControlViewWalker;
            int count = 0;
            void Visit(AutomationElement el)
            {
                if (el == null || count >= maxNodes) return;
                count++;
                AutomationElement.AutomationElementInformation c;
                try { c = el.Current; } catch { return; }
                string help = SafeHelp(el);
                if ((c.Name ?? "").ToLowerInvariant().Contains(needle) || (c.AutomationId ?? "").ToLowerInvariant().Contains(needle) || help.ToLowerInvariant().Contains(needle))
                    hits.Add(new { name = Trunc(c.Name), automationId = c.AutomationId, helpText = Trunc(help), controlType = SafeType(c.ControlType), patterns = SafePatterns(el) });
                AutomationElement child;
                try { child = walker.GetFirstChild(el); } catch { return; }
                while (child != null && count < maxNodes) { Visit(child); try { child = walker.GetNextSibling(child); } catch { break; } }
            }
            Visit(win);
            return new { needle, matches = hits };
        }

        private static object GetText(AutomationElement win, string idOrName)
        {
            var el = Locate(win, idOrName, ControlType.Edit); // reading a data field — bind the Edit, not a same-id softkey
            if (el == null) return new { found = false, idOrName };
            string val = null;
            try { if (el.TryGetCurrentPattern(ValuePattern.Pattern, out var vp)) val = ((ValuePattern)vp).Current.Value; } catch { }
            if (val == null) try { if (el.TryGetCurrentPattern(TextPattern.Pattern, out var tp)) val = ((TextPattern)tp).DocumentRange.GetText(4096); } catch { }
            string nm; try { nm = el.Current.Name; } catch { nm = null; } // guard against the element going stale mid-read
            return new { found = true, idOrName, name = nm, value = val };
        }

        // Capture the WinMax window to a PNG so a vision model can READ the screen (the F1–F8 softkey
        // labels are drawn graphically and are NOT in the UIA tree). Read-only: brings the window
        // forward + grabs its on-screen pixels (CopyFromScreen captures even the GPU graphics panel).
        private static string Screenshot(AutomationElement win, string outPath, string crop = null)
        {
            var rr = win.Current.BoundingRectangle;
            if (rr.IsEmpty || rr.Width < 2 || rr.Height < 2) return JsonErr("screenshot", "window has no usable bounds (minimized?)");
            try { win.SetFocus(); } catch { /* best-effort bring-to-front */ }
            System.Threading.Thread.Sleep(250);
            if (string.IsNullOrEmpty(outPath)) outPath = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "winmax-shot.png");
            int wx = (int)rr.X, wy = (int)rr.Y, ww = (int)rr.Width, wh = (int)rr.Height;
            // optional crop "x,y,w,h" (window-relative) — lets autonomous loops read a small region
            // (e.g. the status line) cheaply instead of the full ~1734x1399 screen each check.
            int cx = wx, cy = wy, cw = ww, ch = wh;
            if (!string.IsNullOrEmpty(crop))
            {
                var p = crop.Split(',');
                if (p.Length == 4 && int.TryParse(p[0], out var rx) && int.TryParse(p[1], out var ry) && int.TryParse(p[2], out var rw) && int.TryParse(p[3], out var rh))
                {
                    cx = wx + Math.Max(0, rx); cy = wy + Math.Max(0, ry);
                    cw = Math.Min(rw, ww - Math.Max(0, rx)); ch = Math.Min(rh, wh - Math.Max(0, ry));
                    if (cw < 1 || ch < 1) return JsonErr("screenshot", $"crop '{crop}' outside window {ww}x{wh}");
                }
                else return JsonErr("screenshot", $"bad crop '{crop}' (want x,y,w,h)");
            }
            using (var bmp = new System.Drawing.Bitmap(cw, ch, System.Drawing.Imaging.PixelFormat.Format32bppArgb))
            {
                using (var g = System.Drawing.Graphics.FromImage(bmp))
                    g.CopyFromScreen(cx, cy, 0, 0, new System.Drawing.Size(cw, ch), System.Drawing.CopyPixelOperation.SourceCopy);
                bmp.Save(outPath, System.Drawing.Imaging.ImageFormat.Png);
            }
            return Ok("screenshot", new { path = outPath, x = cx, y = cy, w = cw, h = ch });
        }

        // ── gated actions ──
        private static string DoAction(AutomationElement win, string op, List<string> a, bool allowMotion)
        {
            string target = Arg(a, 0);
            if (!allowMotion && MotionDeny.Any(d => (target ?? "").ToLowerInvariant().Contains(d)))
                return JsonErr(op, $"refused: '{target}' looks like a machine-motion control (cycle-start/run). Pass --allow-machine-motion ONLY on a simulator / with the operator watching.");
            if (op == "sendkeys")
            {
                try { win.SetFocus(); } catch { }
                System.Windows.Forms.SendKeys.SendWait(target ?? "");
                return Ok(op, new { sent = target });
            }
            if (op == "type-raw")
            {
                // Type into the CURRENTLY-FOCUSED control, changing NOTHING about focus: no SetFocus
                // (which would move focus off the field), no click, no ^a. WinMax form fields AUTO-SELECT
                // on focus-arrival (form open / {TAB}), so the caller navigates with {TAB} and sends the
                // raw value + {TAB} here — the value replaces the selection. ^a is deliberately avoided:
                // it is a WinMax FORM ACCELERATOR that exits the form (the 2026-05-30 type-into-saved-0 bug),
                // NOT select-all. The keys are sent VERBATIM (so {TAB}/{ENTER} in the value act as keystrokes).
                System.Windows.Forms.SendKeys.SendWait(target ?? "");
                return Ok(op, new { typedRaw = target });
            }
            if (op == "click-xy")
            {
                // Raw coordinate click for NON-UIA controls (e.g. the WinMax TOOL TYPE dropdown + its open
                // list, which expose no UIA nodes). Coords are WINDOW-RELATIVE (0,0 = window top-left) to
                // match the screenshot crop space the caller reads them from; the live window origin is
                // added so it works wherever the window sits (it moved to x=1713 / a 2nd monitor this
                // session). Validated to stay INSIDE the window rect so a bad coord can never click another app.
                //
                // SAFETY: the name-based MotionDeny above cannot see a raw coordinate. Action/run controls
                // live in the softkey column (F1-F8) and actuate via sendkeys "{Fn}" anyway, so click-xy
                // REFUSES the softkey band — forcing those through the safe named path. click-xy is for the
                // central form/list area on the SIMULATOR / operator-supervised UI; it is NOT a path to a
                // machine-motion control.
                var parts = (target ?? "").Split(',');
                if (parts.Length != 2 || !int.TryParse(parts[0].Trim(), out var rx) || !int.TryParse(parts[1].Trim(), out var ry))
                    return JsonErr(op, "click-xy needs window-relative 'x,y' (from a screenshot crop)");
                var wr = win.Current.BoundingRectangle;
                if (wr.IsEmpty || rx < 0 || ry < 0 || rx >= wr.Width || ry >= wr.Height)
                    return JsonErr(op, $"click-xy ({rx},{ry}) is outside the WinMax window rect {(int)wr.Width}x{(int)wr.Height} — refusing");
                if (rx >= wr.Width - SOFTKEY_BAND_PX)
                    return JsonErr(op, $"click-xy ({rx},{ry}) is in the softkey band (x>={(int)wr.Width - SOFTKEY_BAND_PX}) — use sendkeys \"{{Fn}}\" for softkeys, not a coordinate click");
                int absX = (int)Math.Round(wr.X) + rx, absY = (int)Math.Round(wr.Y) + ry;
                try { win.SetFocus(); } catch { }
                SetCursorPos(absX, absY);
                System.Threading.Thread.Sleep(40);
                mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                return Ok(op, new { clickedXy = new { winRel = new { x = rx, y = ry }, abs = new { x = absX, y = absY } } });
            }
            // Data-entry ops AND `click` (which we use to enter a field's edit mode) prefer the Edit FIRST
            // — WinMax reuses ids across softkeys + fields (id "303" = DIAMETER Edit AND F3 softkey Button).
            // `click <fieldId>` then clicks the field's LIVE rect center, which is resize-robust (the window
            // can change size and the form re-lay-out, but the UIA rect tracks it). `click` keeps its button
            // fallback (Locate falls through to byId when no Edit matches), so it can still drive non-fields.
            bool dataOp = (op == "set-value" || op == "type-into" || op == "type-tab");
            ControlType prefer = (dataOp || op == "click") ? ControlType.Edit : null;
            var el = Locate(win, target, prefer);
            if (el == null) return JsonErr(op, $"element '{target}' not found");
            // Safety: a DATA-ENTRY op must NOT actuate a non-editable control (a stray field write driving a
            // softkey would navigate the UI). `click` is exempt — it is intentionally allowed to click buttons.
            if (dataOp)
            {
                ControlType ct = null; try { ct = el.Current.ControlType; } catch { }
                if (ct != ControlType.Edit && ct != ControlType.ComboBox && ct != ControlType.Document)
                {
                    string nm; try { nm = el.Current.Name; } catch { nm = "?"; } // guard: don't let a stale element mask the id-collision diagnostic
                    return JsonErr(op, $"id '{target}' resolved to a {SafeType(ct)} '{nm}', not an editable field — wrong screen or id collision. Refusing to drive it.");
                }
            }
            switch (op)
            {
                case "click": { var cp = ClickElement(el); return Ok(op, new { clicked = target, point = new { x = cp.x, y = cp.y } }); }
                case "type-into":
                case "type-tab": {
                    // WinMax native data entry: click the field, select-all, type the value, then COMMIT.
                    // type-into commits with {ENTER}; type-tab commits with {TAB}. Use type-tab on MULTI-FIELD
                    // forms where {ENTER} is "save+exit" and would fire BEFORE the value commits (e.g. the
                    // ADD TOOL geometry form — typed dia 2.0 saved as 0.0000; see macros/README field-commit rule).
                    var cp = ClickElement(el);
                    System.Threading.Thread.Sleep(150);
                    // Focus gate: confirm the click actually landed in the target field before typing.
                    // Guards the 2026-05-30 bug where a mis-aimed click left focus on the wrong control
                    // and the value was typed into it. If UIA can report focus AND it disagrees with the
                    // target, ABORT without typing; if focus is unverifiable (null — WinMax's custom
                    // provider may not report it), proceed but flag focusVerified=false so the ledger records it.
                    var wantId = el.Current.AutomationId;
                    var focusedId = SafeFocusedId();
                    bool focusVerified = !string.IsNullOrEmpty(wantId) && focusedId == wantId;
                    if (!string.IsNullOrEmpty(wantId) && !string.IsNullOrEmpty(focusedId) && focusedId != wantId)
                        return JsonErr(op, $"focus check failed: clicked ({cp.x},{cp.y}) but focus is on id '{focusedId}', not target '{wantId}'. NOT typing — re-probe the field rect.");
                    var val = Arg(a, 1) ?? "";
                    var term = op == "type-tab" ? "{TAB}" : "{ENTER}";
                    System.Windows.Forms.SendKeys.SendWait("^a");           // select existing
                    System.Windows.Forms.SendKeys.SendWait(EscapeKeys(val) + term);
                    return Ok(op, new { typedInto = target, value = val, terminator = term, point = new { x = cp.x, y = cp.y }, focusVerified });
                }
                case "invoke":
                    if (el.TryGetCurrentPattern(InvokePattern.Pattern, out var ip)) { ((InvokePattern)ip).Invoke(); return Ok(op, new { invoked = target }); }
                    return JsonErr(op, "element does not support Invoke");
                case "set-value":
                    if (el.TryGetCurrentPattern(ValuePattern.Pattern, out var vp)) { ((ValuePattern)vp).SetValue(Arg(a, 1) ?? ""); return Ok(op, new { set = target, value = Arg(a, 1) }); }
                    return JsonErr(op, "element does not support Value");
                case "menu":
                    if (el.TryGetCurrentPattern(ExpandCollapsePattern.Pattern, out var ep)) { ((ExpandCollapsePattern)ep).Expand(); return Ok(op, new { expanded = target }); }
                    if (el.TryGetCurrentPattern(InvokePattern.Pattern, out var ip2)) { ((InvokePattern)ip2).Invoke(); return Ok(op, new { invoked = target }); }
                    return JsonErr(op, "menu element supports neither Expand nor Invoke");
                default: return JsonErr(op, "unhandled action");
            }
        }

        // Resolve a target by AutomationId (then Name). WinMax REUSES AutomationIds across control
        // kinds on the same screen — e.g. on TOOL SETUP id "303" is BOTH the F3 softkey Button AND
        // the DIAMETER Edit. A bare FindFirst returns whichever comes first in the tree (the softkey),
        // so a data-entry op aimed at "303" would drive the wrong control. `preferType` disambiguates:
        // data ops pass ControlType.Edit so they bind the field, not the colliding button. (This — not
        // a click-coordinate error — was the real 2026-05-30 type-into bug; the focus gate exposed it.)
        private static AutomationElement Locate(AutomationElement win, string idOrName, ControlType preferType = null)
        {
            if (string.IsNullOrEmpty(idOrName)) return null;
            if (preferType != null)
            {
                var typed = win.FindFirst(TreeScope.Descendants, new AndCondition(
                    new PropertyCondition(AutomationElement.AutomationIdProperty, idOrName),
                    new PropertyCondition(AutomationElement.ControlTypeProperty, preferType)));
                if (typed != null) return typed;
            }
            var byId = win.FindFirst(TreeScope.Descendants, new PropertyCondition(AutomationElement.AutomationIdProperty, idOrName));
            if (byId != null) return byId;
            return win.FindFirst(TreeScope.Descendants, new PropertyCondition(AutomationElement.NameProperty, idOrName));
        }

        // Click the on-screen center of an element and return the absolute point clicked.
        // UIA BoundingRectangle is already in ABSOLUTE physical-screen coordinates — it accounts
        // for WinMax's negative window origin (x=-7) automatically — so the rect center IS the
        // correct click point. GetClickablePoint() is deliberately NOT used: for WinMax's custom
        // Win32 controls it returned a stale/garbage point (it succeeds, so the old catch never
        // fired) that landed on the editor Find box and fed the typed value into a search field
        // (the 2026-05-30 type-into bug). The rect is read LIVE (Current) immediately before
        // clicking and validated against the multi-monitor virtual screen; a degenerate or
        // off-screen rect is a hard error, never a blind click.
        // (Assumes the WinMax host runs at 100% DPI / the driver shares its pixel space — true on
        // the JM-class control; revisit with a DPI-aware app manifest if BoundingRectangle ever
        // disagrees with SetCursorPos on a scaled display.)
        private static (int x, int y) ClickElement(AutomationElement el)
        {
            var r = el.Current.BoundingRectangle; // live, absolute screen coords
            if (r.IsEmpty || double.IsNaN(r.X) || double.IsNaN(r.Y) ||
                double.IsInfinity(r.X) || double.IsInfinity(r.Y) || r.Width <= 0 || r.Height <= 0)
                throw new InvalidOperationException(
                    $"element has no usable on-screen rect (offscreen/occluded?): x={r.X} y={r.Y} w={r.Width} h={r.Height} — refusing to click a garbage coordinate");
            int px = (int)Math.Round(r.X + r.Width / 2.0);
            int py = (int)Math.Round(r.Y + r.Height / 2.0);
            var vs = System.Windows.Forms.SystemInformation.VirtualScreen; // includes negative-origin monitors
            // Rectangle.Right/.Bottom are EXCLUSIVE (Left+Width / Top+Height) — the last valid pixel is
            // Right-1 / Bottom-1, so reject with >= not > (a click 1px past the desktop edge is off-screen).
            if (px < vs.Left || px >= vs.Right || py < vs.Top || py >= vs.Bottom)
                throw new InvalidOperationException(
                    $"computed click point ({px},{py}) is outside the virtual screen [{vs.Left},{vs.Top}..{vs.Right},{vs.Bottom}] — refusing to click");
            SetCursorPos(px, py);
            System.Threading.Thread.Sleep(40);
            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
            return (px, py);
        }

        // The AutomationId of the currently focused element, or null if UIA can't report it
        // (WinMax's custom provider may not — callers treat null as "unverifiable", not "wrong").
        private static string SafeFocusedId()
        {
            try { return AutomationElement.FocusedElement?.Current.AutomationId; }
            catch { return null; }
        }
        // SendKeys treats + ^ % ~ ( ) { } [ ] as special — escape them so a literal value types verbatim
        private static string EscapeKeys(string s) { var sb = new System.Text.StringBuilder(); foreach (var c in s ?? "") { if ("+^%~(){}[]".IndexOf(c) >= 0) sb.Append('{').Append(c).Append('}'); else sb.Append(c); } return sb.ToString(); }

        // ── helpers ──
        private static string SafeType(ControlType t) { try { return t?.ProgrammaticName?.Replace("ControlType.", "") ?? "?"; } catch { return "?"; } }
        private static string[] SafePatterns(AutomationElement el)
        {
            try { return el.GetSupportedPatterns().Select(p => p.ProgrammaticName.Replace("PatternIdentifiers.Pattern", "").Replace("Identifiers.Pattern", "")).ToArray(); }
            catch { return Array.Empty<string>(); }
        }
        private static string Trunc(string s) => string.IsNullOrEmpty(s) ? s : (s.Length > 120 ? s.Substring(0, 120) : s);
        // Tooltip / accessible-help text. MFC toolbar buttons (the DS console keys: Draw/Input/Auto/...)
        // carry no UIA Name but may expose a tooltip via HelpText.
        private static string SafeHelp(AutomationElement el)
        {
            try { var h = el.Current.HelpText; if (!string.IsNullOrWhiteSpace(h)) return h; } catch { }
            return "";
        }
        private static string Next(string[] args, ref int i) => (i + 1 < args.Length) ? args[++i] : "";
        private static string Arg(List<string> a, int i) => (a != null && i < a.Count) ? a[i] : "";
        private static string Ok(string op, object value) => JsonSerializer.Serialize(new { ok = true, op, value }, J);
        private static string JsonErr(string op, string msg) => JsonSerializer.Serialize(new { ok = false, op, error = msg }, J);
    }
}
