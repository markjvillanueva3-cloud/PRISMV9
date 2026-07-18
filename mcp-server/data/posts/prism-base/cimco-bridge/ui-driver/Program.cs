// PrismCimcoUI - drive CIMCO Edit 2026 Machine Simulation via MSAA / IAccessible (oleacc). slot:echo, 2026-06-04.
//
// WHY MSAA, not UIA: CIMCO's Codejock XTP ribbon ships an MSAA (IAccessible) provider but NO UI-Automation
// provider, so System.Windows.Automation sees an empty 15-21 node tree (0 buttons) while oleacc
// AccessibleObjectFromWindow on the XTPToolBar exposes ~213 children. PowerShell 5.1 cannot traverse
// IAccessible reliably (COM arg-binding does not QI; AccessibleChildren returns empty names); compiled C#
// does the VARIANT marshaling cleanly. This is the SPINE-2 driver per CIMCO-SPINE2-LIVESIM-PLAN A5/A6.
//
// Ops (one JSON line to stdout, last line = the result):
//   --op map                 walk the MSAA tree of the ribbon/command bars -> flat control list
//                            (name / role / defaultAction / path / cid). READ-ONLY. The driver map.
//   --op find <text>         controls whose accName contains <text> (case-insensitive). READ-ONLY.
//   --op invoke <name>       accDoDefaultAction on the named control. GATED behind --allow-actions.
//   --op window-info         the XTPMainFrame hwnd + title. READ-ONLY.
//   --op read-report [--name <pane>]  read the Machine-Simulation report docking-pane subtree (value-aware).
//   --op invoke-read [--pre <cfg-ctl>] [--name <ctl>] [--then <run-ctl>]   ONE process: if --pre, invoke <cfg-ctl>
//                                     (e.g. "Check collision and limit errors") to pre-configure the sim -> invoke
//                                     <ctl> (default "Machine Simulation") -> if --then, invoke <run-ctl> (e.g.
//                                     "Simulate") so the sim ACTUALLY runs -> settle -> read the report. Holds the
//                                     frame handle throughout (fixes the unreliable two-process attach). --allow-actions.
//                            READ-ONLY. Emits {found, container, nodes:[{text,value,role,path}], frameNodeCount}.
//                            Fail-closed: <50 nodes -> blockedBy ribbon-uia-unrealized; no report container ->
//                            found:false + blockedBy report-grid-not-found + candidates[] (NEVER a clean empty).
//                            --name overrides the container heuristic once the live pane name is known.
//   --op list-windows [--pre <ctl>]   CRASH-SAFE Win32-ONLY enumeration of every visible top-level window
//                            (+ its descendant controls: class/title/dialog-cid). NO MSAA -> cannot trigger the
//                            provider AV that crashed the old read-window op. --pre fires a control first (GATED
//                            behind --allow-actions) so its config/file dialog is on screen for enumeration.
//                            Emits {windows:[{hwnd,class,title,children:[{class,title,cid}],childrenTruncated?}]}.
//                            SINK MUST STAY GITIGNORED: titles include the operator's browser/editor windows.
//   --op setup-pages [--pre <ctl>]    Map the CIMCO Setup property-sheet: open it (--pre defaults to
//                            "Configure Machine Type"), find the #32770 + its SysTreeView32, and for EVERY tree page
//                            (HTREEITEM walk via TVM_GETNEXTITEM -- no cross-process marshaling) select it
//                            (TVM_SELECTITEM) + Win32-enumerate the page's visible controls. GATED --allow-actions.
//                            Emits {dialog,tree,pageCount,pages:[{item,controls:[{class,title,cid}],controlsTruncated?}]}.
//   --op read-setting --name <hint>   READ a Setup page's control states: open Setup, navigate to the page whose
//                            controls contain <hint> (substring of a control title), report every control + each
//                            checkbox's checked state via BM_GETCHECK (a READ msg -- nothing changes/persists; tree
//                            left neutral). GATED --allow-actions (opens a dialog). Win32-only. e.g. --name
//                            "advanced simulation" -> 'Disable advanced simulation' cid 14016 checked=false = add-on ON.
//                            Emits {page,controls:[{class,title,cid,checked?,checkState?,selIndex?,selected?}]}
//                            (checked* for checkboxes; selIndex/selected = a ComboBox's CURRENT selection only --
//                            a future load-machine WRITER must CB_GETCOUNT + per-index CB_GETLBTEXT to map a target
//                            machine NAME -> the index to CB_SETCURSEL; this op does not expose the full option list).
//   --op set-setting --name <page-hint> --cid <id> --to <on|off> [--persist]   WRITE a Setup 2-state checkbox.
//                            SAFE-BY-DEFAULT: toggle to target (BM_CLICK only if current != target) -> READ-BACK-
//                            VERIFY -> DISCARD via Cancel (NOTHING persists). --persist + verified -> OK (persists).
//                            Dialog ALWAYS closed (button, else WM_CLOSE discard). 2-state-checkbox-only (3-state +
//                            combo/edit refused/TBD). GATED --allow-actions. exit 1 if unverified. `persisted` and
//                            `closedWith` reflect the REAL close (OK | Cancel | WM_CLOSE), never intent.
//                            Emits {cid,title,before,desired,after,verified,persisted,closedWith}.
//   --op list-combo --name <page-hint> --cid <id>   READ a Setup ComboBox's FULL option list + current selection
//                            (CB_GETCOUNT + CB_GETLBTEXT per index -- the option list read-setting cannot expose).
//                            READ-ONLY (no write/persist); dialog ALWAYS closed. GATED --allow-actions.
//                            Emits {cid,count,current:{index,text},options:[{index,text}...]}. Maps machine NAME->index.
//   --op set-combo --name <page-hint> --cid <id> --to <name|index> [--persist]   WRITE: select a ComboBox item by
//                            machine NAME (exact, else UNIQUE substring -- fail-closed) or index. The .mcfg machine-load
//                            wire (cid 14307 "Machine setup:") + controller select (cid 14639 "Control Type:").
//                            SAFE-BY-DEFAULT: CB_SETCURSEL -> WM_COMMAND/CBN_SELCHANGE notify -> READ-BACK-VERIFY ->
//                            DISCARD via Cancel UNLESS --persist (then OK persists). Dialog ALWAYS closed. GATED
//                            --allow-actions. exit 1 if unverified. Emits {cid,before,target,afterIndex,verified,persisted,closedWith}.
//
// LAUNCH/ATTACH: with --launch (+--nc <file>) it starts "CIMCOEdit.exe /ms <nc>" and waits for the frame,
// then KILLS it at exit unless --keep. Without --launch it ATTACHES to a running CIMCO and never kills it
// (single-instance safe). Build: csc.exe /target:exe /platform:x64 /out:PrismCimcoUI.exe
//   /r:"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\Accessibility.dll" Program.cs   (no .NET SDK needed)

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using Accessibility;

namespace PRISM.Cimco.UI
{
    internal static class Program
    {
        // CIMCO Edit launcher path. Resolved at startup (NOT a compile-time const) so a reinstall to a
        // different drive needs no recompile: PRISM_CIMCO_EXE env override first, then the known install
        // roots (H: new install preferred over the legacy C: Program Files), first-that-exists wins.
        private static readonly string EXE = ResolveCimcoExe();
        private const uint OBJID_CLIENT = 0xFFFFFFFC;
        private static Guid IID_IAccessible = new Guid("618736E0-3C3D-11CF-810C-00AA00389B71");
        // The command-bar host classes that carry the ribbon's MSAA children (+ the frame itself).
        private static readonly string[] BarClasses = { "XTPToolBar", "XTPDockBar", "XTPStatusBar", "AfxWnd140", "MDIClient" };
        // Controls that START machine motion OR write/transmit (file-out, DNC, post) - never auto-invoked
        // without --allow-actions, and even then refused by name. Matched against the RESOLVED control's
        // accName (not the operator query). Advisory defense-in-depth; --allow-actions is the primary gate.
        // NOTE: deliberately does NOT include "setup" - "Backplot Setup"/"Tool Setup" are config dialogs
        // the sim flow legitimately needs to open; they write nothing to a machine.
        private static readonly string[] MotionDeny = { "transmit", "send to machine", "send to", "dnc", "punch", "cycle start", "save", "export", "post to", "output to", "write to", "g-code out", "g code out" };

        // Resolve the CIMCO Edit executable: env override, then known install roots (H: new install first,
        // legacy C: Program Files + the resources copy as fallbacks). Returns the first that exists; else the
        // preferred default so the launch path's File.Exists check fails loud with a clear remedy message.
        private static string ResolveCimcoExe()
        {
            var env = Environment.GetEnvironmentVariable("PRISM_CIMCO_EXE");
            if (!string.IsNullOrEmpty(env) && System.IO.File.Exists(env)) return env;
            string[] candidates = {
                @"H:\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe",
                @"C:\Program Files\CIMCO 2026\CIMCOEdit\CIMCOEdit.exe",
                @"H:\PRISM\resources\cimco-2026\CIMCOEdit\CIMCOEdit.exe",
            };
            foreach (var c in candidates) if (System.IO.File.Exists(c)) return c;
            return candidates[0];
        }

        [STAThread]
        private static int Main(string[] args)
        {
            string op = "map", name = null, nc = null, then = null, preCtl = null, toVal = null;
            int settle = 9, waitSec = 45, depth = 6, targetCid = -1;
            bool launch = false, keep = false, allowActions = false, persist = false;
            for (int i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--op": op = Next(args, ref i); break;
                    case "--name": name = Next(args, ref i); break;
                    case "--then": then = Next(args, ref i); break;
                    case "--pre": preCtl = Next(args, ref i); break;
                    case "--nc": nc = Next(args, ref i); break;
                    case "--settle": int.TryParse(Next(args, ref i), out settle); break;
                    case "--wait": int.TryParse(Next(args, ref i), out waitSec); break;
                    case "--depth": int.TryParse(Next(args, ref i), out depth); break;
                    case "--cid": int.TryParse(Next(args, ref i), out targetCid); break;
                    case "--to": toVal = Next(args, ref i); break;
                    case "--persist": persist = true; break;
                    case "--launch": launch = true; break;
                    case "--keep": keep = true; break;
                    case "--allow-actions": allowActions = true; break;
                }
            }

            bool launchedHere = false;
            var ownedPids = new HashSet<int>();
            try
            {
                IntPtr frame = FindFrame();
                if (frame == IntPtr.Zero && launch)
                {
                    if (string.IsNullOrEmpty(nc)) { Console.WriteLine(Err(op, "--launch needs --nc <file>")); return 2; }
                    // Validate nc: reject illegal chars (embedded quote/control -> CIMCOEdit arg-injection) and
                    // require the file to exist - launching a sim on a missing NC then reading an empty report is
                    // the "empty report reads clean" hazard; refuse up front (fail-closed).
                    if (nc.IndexOf('"') >= 0 || HasControlChar(nc)) { Console.WriteLine(Err(op, "--nc contains illegal characters")); return 2; }
                    if (!System.IO.File.Exists(nc)) { Console.WriteLine(Err(op, "--nc file not found: " + nc)); return 2; }
                    // Fail loud if the resolved CIMCO Edit executable is missing (e.g. reinstalled elsewhere) -
                    // launching a non-existent exe would otherwise throw opaquely or hang the frame-wait.
                    if (!System.IO.File.Exists(EXE)) { Console.WriteLine(Err(op, "CIMCO Edit not found at " + EXE + " (set PRISM_CIMCO_EXE to the CIMCOEdit.exe path)")); return 2; }
                    // Snapshot pre-existing CIMCO PIDs so the finally kills ONLY processes WE start - never the
                    // operator's manually-opened editor or a peer fleet-slot's CIMCO (single-instance + 26 chats).
                    var pre = new HashSet<int>();
                    foreach (var pn in new[] { "CIMCOEdit", "CIMCOSimulation" })
                        foreach (var p in Process.GetProcessesByName(pn)) pre.Add(p.Id);
                    var psi = new ProcessStartInfo(EXE, "/ms \"" + nc + "\"") { UseShellExecute = false, WorkingDirectory = System.IO.Path.GetDirectoryName(EXE) };
                    Process.Start(psi);
                    launchedHere = true;
                    var sw = Stopwatch.StartNew();
                    while (sw.Elapsed.TotalSeconds < waitSec && frame == IntPtr.Zero) { Thread.Sleep(500); frame = FindFrame(); }
                    // Record only the NEW pids as owned. If CIMCO is single-instance and /ms was forwarded to a
                    // pre-existing instance (our child exits), no new pid appears -> ownedPids stays empty -> we
                    // attach and NEVER kill the operator's instance.
                    foreach (var pn in new[] { "CIMCOEdit", "CIMCOSimulation" })
                        foreach (var p in Process.GetProcessesByName(pn)) if (!pre.Contains(p.Id)) ownedPids.Add(p.Id);
                }
                if (frame == IntPtr.Zero) { Console.WriteLine(Err(op, "no XTPMainFrame window (is CIMCO Edit running? pass --launch --nc to start it)")); return 2; }

                if (op == "window-info")
                {
                    Console.WriteLine("{\"ok\":true,\"op\":\"window-info\",\"frame\":\"" + Hex(frame) + "\",\"title\":\"" + Esc(WindowTitle(frame)) + "\"}");
                    return 0;
                }

                // Settle so the ribbon's MSAA provider is fully built, then collect the bar hwnds. Full settle
                // when we launched; a shorter settle on attach too - the operator may have opened CIMCO seconds
                // ago and the MSAA tree is still building (walking it half-built misses controls / mis-resolves invoke).
                Thread.Sleep((launchedHere ? settle : 2) * 1000);
                // A bare `list-windows` (no --pre) needs NO ribbon controls -- it enumerates purely via Win32 --
                // so SKIP the MSAA ribbon walk entirely. This makes the bare-enumeration path genuinely MSAA-free
                // (honoring the op's crash-safety contract, not just "stable") and avoids a wasted ~213-node walk.
                // --pre still needs `ctls` (FireControl resolves its control against it); every other op needs it too.
                var ctls = new List<Ctl>();
                bool needsCtls = !(op == "list-windows" && string.IsNullOrEmpty(preCtl));
                if (needsCtls)
                {
                    var hosts = new List<KeyValuePair<string, IntPtr>> { new KeyValuePair<string, IntPtr>("XTPMainFrame", frame) };
                    foreach (var kv in ChildHwndsByClass(frame, BarClasses)) hosts.Add(kv);

                    // Walk every host's IAccessible tree into one flat control list.
                    foreach (var h in hosts)
                    {
                        IAccessible acc;
                        int hr = AccessibleObjectFromWindow(h.Value, OBJID_CLIENT, ref IID_IAccessible, out acc);
                        if (hr != 0 || acc == null) continue;
                        Walk(acc, h.Key, 0, depth, ctls);
                    }
                }

                switch (op)
                {
                    case "map": Console.WriteLine(MapJson(frame, ctls, null)); return 0;
                    case "find": Console.WriteLine(MapJson(frame, ctls, name)); return 0;
                    case "invoke":
                    {
                        if (string.IsNullOrEmpty(name)) { Console.WriteLine(Err(op, "invoke needs --name")); return 2; }
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: invoke requires --allow-actions (operator-supervised)")); return 3; }
                        // Resolve the control FIRST, then deny-check the RESOLVED accName (denying the operator's
                        // query string would let "save" resolve to "Save Simulation Bundle" and slip past). Prefer an
                        // EXACT accName match; fall back to substring but REFUSE on ambiguity (fail-closed - never
                        // silently fire whichever matched first).
                        string lname = name.ToLowerInvariant();
                        Ctl hit = null; var subs = new List<Ctl>();
                        foreach (var c in ctls)
                        {
                            if (c.Name == null) continue;
                            string cl = c.Name.ToLowerInvariant();
                            if (cl == lname && hit == null) hit = c;
                            if (cl.Contains(lname)) subs.Add(c);
                        }
                        if (hit == null)
                        {
                            if (subs.Count == 0) { Console.WriteLine(Err(op, "no control matching '" + name + "' (run --op map to see names)")); return 2; }
                            if (subs.Count > 1)
                            {
                                var nm = new StringBuilder();
                                for (int k = 0; k < subs.Count && k < 8; k++) { if (k > 0) nm.Append(", "); nm.Append("'").Append(subs[k].Name).Append("'"); }
                                Console.WriteLine(Err(op, "ambiguous: " + subs.Count + " controls match '" + name + "' [" + nm + "] - use an exact name")); return 2;
                            }
                            hit = subs[0];
                        }
                        string hl = hit.Name.ToLowerInvariant();
                        if (Array.Exists(MotionDeny, d => hl.Contains(d))) { Console.WriteLine(Err(op, "refused: resolved control '" + hit.Name + "' is on the motion/write deny-list")); return 3; }
                        // accDoDefaultAction on a Codejock control is SYNCHRONOUS and can BLOCK FOREVER - it opens a
                        // modal / waits on foreground (observed live: invoke "Backplot" never returned). Arm a
                        // watchdog that force-exits with a "blocked" result if the action does not return in time, so
                        // the process NEVER hangs. The action WAS dispatched; "blocked" => a modal likely opened
                        // (the orchestrator handles it out-of-band). Neither ok:true nor blocked is a clearance signal.
                        string invJson = "{\"ok\":true,\"op\":\"invoke\",\"invoked\":\"" + Esc(hit.Name) + "\",\"da\":\"" + Esc(hit.Da) + "\",\"path\":\"" + Esc(hit.Path) + "\",\"effectUnverified\":true,";
                        int printed = 0;
                        var watchdog = new Thread(() =>
                        {
                            for (int s = 0; s < 80; s++) { Thread.Sleep(100); if (Volatile.Read(ref printed) != 0) return; }
                            if (Interlocked.CompareExchange(ref printed, 2, 0) == 0)
                            {
                                Console.WriteLine(invJson + "\"blocked\":true,\"note\":\"accDoDefaultAction dispatched but did not return in 8s - likely opened a modal/dialog; not a clearance signal\"}");
                                Console.Out.Flush();
                                Environment.Exit(0);
                            }
                        });
                        watchdog.IsBackground = true;
                        watchdog.Start();
                        Exception iex = null;
                        try { hit.Acc.accDoDefaultAction(hit.ChildId); } catch (Exception e) { iex = e; }
                        if (Interlocked.CompareExchange(ref printed, 1, 0) != 0) return 0; // watchdog already reported "blocked"
                        if (iex != null) { Console.WriteLine(Err(op, "accDoDefaultAction threw: " + iex.Message)); return 1; }
                        // ok:true means ONLY that the default action fired without throwing (a disabled/no-op control
                        // can return S_OK). NEVER a collision-check / clearance signal; assessLiveRunClearance owns that.
                        Console.WriteLine(invJson + "\"note\":\"accDoDefaultAction fired; UI effect not verified; not a clearance signal\"}");
                        return 0;
                    }
                    case "invoke-read":
                    {
                        // U-CIMCO-INVOKE-READ: invoke the named sim control, settle, then read the report --
                        // ALL IN ONE PROCESS. The two-process path (--op invoke --keep, then a SEPARATE --op
                        // read-report) was unreliable in batch: the read process could not reliably attach to the
                        // window the invoke process held (returned no-read). Holding the frame handle through
                        // invoke->settle->read removes that race. Defaults --name "Machine Simulation".
                        if (string.IsNullOrEmpty(name)) name = "Machine Simulation";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: invoke-read requires --allow-actions (fires a UI action)")); return 3; }
                        // Optional --pre: fire a config control FIRST (e.g. "Check collision and limit errors")
                        // so the sim is set up to actually report before we open + run it. Non-fatal if it can't
                        // resolve -- recorded in invokeState.
                        string preState = null;
                        if (!string.IsNullOrEmpty(preCtl)) { preState = FireControl(ctls, preCtl); Thread.Sleep(2000); }
                        // Open the sim view, then (if --then given) fire the RUN control so the collision-check
                        // ACTUALLY executes -- the report pane only populates AFTER a sim runs. Invoking just the sim
                        // tab leaves the report empty (report-grid-not-found). Both via FireControl (resolve + deny +
                        // soft Join timeout). An open that cannot even resolve/deny is fatal; a run failure is recorded
                        // but we still read (the report then honestly reads found:false, never a fake clean pass).
                        string openState = FireControl(ctls, name);
                        if (openState.StartsWith("no-match:") || openState.StartsWith("ambiguous:") || openState.StartsWith("denied:"))
                        { Console.WriteLine(Err(op, "open invoke failed (" + openState + ") -- run --op map to see control names")); return 2; }
                        string runState = null;
                        if (!string.IsNullOrEmpty(then))
                        {
                            Thread.Sleep(3000); // let the sim tab activate before firing the run control
                            runState = FireControl(ctls, then);
                        }
                        string invokeState = (preCtl != null ? "pre=" + preState + ";" : "") + (then != null ? ("open=" + openState + ";run=" + runState) : ("open=" + openState));
                        // Settle so the sim view + report pane fully paint, then read the SAME live frame.
                        Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
                        int irDepth = depth < 10 ? 12 : depth;
                        var irNodes = new List<RNode>();
                        var irHosts = new List<IntPtr> { frame };
                        irHosts.AddRange(AllChildHwnds(frame));
                        foreach (var hw in irHosts)
                        {
                            IAccessible ra;
                            if (AccessibleObjectFromWindow(hw, OBJID_CLIENT, ref IID_IAccessible, out ra) != 0 || ra == null) continue;
                            WalkReport(ra, "root", 0, irDepth, irNodes);
                            if (irNodes.Count > 12000) break;
                        }
                        if (irNodes.Count < 50) { Console.WriteLine(ReportEnvelope(false, false, null, null, irNodes, "ribbon-uia-unrealized", invokeState)); return 0; }
                        RNode irContainer = FindReportContainer(irNodes, null); // --name is the INVOKE control here, not the report pane -> heuristic
                        if (irContainer == null) { Console.WriteLine(ReportEnvelope(true, false, null, irNodes, irNodes, "report-grid-not-found", invokeState)); return 0; }
                        var irSub = new List<RNode>();
                        if (irContainer.Acc != null && irContainer.ChildId is int && (int)irContainer.ChildId == 0)
                            WalkReport(irContainer.Acc, irContainer.Name ?? "report", 0, irDepth, irSub);
                        if (irSub.Count == 0) irSub.Add(irContainer);
                        Console.WriteLine(ReportEnvelope(true, true, irContainer, irSub, irNodes, null, invokeState));
                        return 0;
                    }
                    case "read-report":
                    {
                        // U-CIMCO-SIM-1A: read the Machine-Simulation report pane via MSAA. READ-ONLY (no
                        // accDoDefaultAction -> no hang risk; the orchestrator spawn-timeout is the backstop).
                        // The report is a DOCKING PANE, not a ribbon bar, so this walks the frame client + every
                        // child window (value-aware: grid cells carry text in accValue, which the ribbon Walk drops).
                        // Honest scope: the live grid's MSAA shape is unproven (the pane only exists after a sim
                        // runs in an operator-opened CIMCO). This op DUMPS the report subtree so the Node-side
                        // normalizer assembles rows + the operator's first live run confirms the shape. FAIL-CLOSED:
                        // a near-empty tree -> ribbon-uia-unrealized; no report container -> report-grid-not-found
                        // (NEVER a clean-empty that reads as "no defects").
                        int rdepth = depth < 10 ? 12 : depth; // the grid nests deeper than the 6-deep ribbon
                        var rnodes = new List<RNode>();
                        var rhosts = new List<IntPtr> { frame };
                        rhosts.AddRange(AllChildHwnds(frame));
                        foreach (var hw in rhosts)
                        {
                            IAccessible ra;
                            if (AccessibleObjectFromWindow(hw, OBJID_CLIENT, ref IID_IAccessible, out ra) != 0 || ra == null) continue;
                            WalkReport(ra, "root", 0, rdepth, rnodes);
                            if (rnodes.Count > 12000) break; // bound
                        }
                        // A4 upstream gate: a near-empty tree means the window/ribbon never realized (cold launch).
                        if (rnodes.Count < 50) { Console.WriteLine(ReportEnvelope(false, false, null, null, rnodes, "ribbon-uia-unrealized")); return 0; }
                        RNode container = FindReportContainer(rnodes, name); // --name overrides the heuristic once the live name is known
                        if (container == null) { Console.WriteLine(ReportEnvelope(true, false, null, rnodes, rnodes, "report-grid-not-found")); return 0; }
                        // Re-walk the container's own IAccessible subtree (exact, vs. fragile path-prefix matching).
                        var sub = new List<RNode>();
                        if (container.Acc != null && container.ChildId is int && (int)container.ChildId == 0)
                            WalkReport(container.Acc, container.Name ?? "report", 0, rdepth, sub);
                        if (sub.Count == 0) sub.Add(container); // simple-element container (a single cell) -> itself
                        Console.WriteLine(ReportEnvelope(true, true, container, sub, rnodes, null));
                        return 0;
                    }
                    case "list-windows":
                    {
                        // U-CIMCO-LISTWIN: CRASH-SAFE window/dialog recon. Win32-ONLY enumeration
                        // (EnumWindows/EnumChildWindows/GetClassName/GetWindowText/GetDlgCtrlID) -- it NEVER calls
                        // AccessibleObjectFromWindow/AccessibleChildren, so it CANNOT trigger the unmanaged MSAA
                        // provider AV that crashed the naive read-window op (exit 255). This is the safe way to SEE a
                        // config/file dialog's drivable controls. Optional --pre fires a control first (e.g.
                        // "Configure Machine Type") so its dialog is on screen when we enumerate -- a MODAL --pre
                        // returns "blocked" (its worker thread is stuck in accDoDefaultAction) but the dialog stays
                        // open, so the subsequent Win32 enumeration still sees it. Firing a control is a UI action ->
                        // gate on --allow-actions when --pre is set (a bare enumeration reads nothing, needs no gate).
                        string lwPre = null;
                        if (!string.IsNullOrEmpty(preCtl))
                        {
                            if (!allowActions) { Console.WriteLine(Err(op, "refused: list-windows --pre fires a UI action, requires --allow-actions")); return 3; }
                            lwPre = FireControl(ctls, preCtl);
                            Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
                        }
                        var lwSb = new StringBuilder();
                        lwSb.Append("{\"ok\":true,\"op\":\"list-windows\",\"frame\":\"").Append(Hex(frame)).Append("\"");
                        if (lwPre != null) lwSb.Append(",\"pre\":\"").Append(Esc(lwPre)).Append("\"");
                        lwSb.Append(",\"windows\":[");
                        // SECURITY: TopLevelWindows() enumerates EVERY visible top-level window system-wide, so titles
                        // include the operator's browser/editor windows (URLs, doc names). The caller's sink for this
                        // output MUST stay gitignored -- never commit a raw list-windows dump.
                        int lwN = 0;
                        foreach (IntPtr top in TopLevelWindows())
                        {
                            if (top == frame) continue;                  // the main frame is already known
                            string cls = ClassOf(top), title = WindowTitle(top);
                            if (string.IsNullOrEmpty(cls) && string.IsNullOrEmpty(title)) continue;
                            if (lwN++ > 0) lwSb.Append(',');
                            lwSb.Append("{\"hwnd\":\"").Append(Hex(top)).Append("\",\"class\":\"").Append(Esc(cls))
                                .Append("\",\"title\":\"").Append(Esc(Trunc(title, 200))).Append("\",\"children\":[");
                            var lwKids = ChildWindowsAll(top);
                            int lwC = 0;
                            foreach (IntPtr ch in lwKids)
                            {
                                if (lwC >= 200) break;                   // bound; a settings property-sheet page can carry ~70-150 controls
                                string ccls = ClassOf(ch), ctitle = WindowTitle(ch);
                                if (lwC++ > 0) lwSb.Append(',');
                                lwSb.Append("{\"class\":\"").Append(Esc(ccls)).Append("\",\"title\":\"")
                                    .Append(Esc(Trunc(ctitle, 120))).Append("\",\"cid\":").Append(GetDlgCtrlID(ch)).Append("}");
                            }
                            // Fail-loud: mark a clipped child list so a truncated settings page is never mistaken for a
                            // complete enumeration (the operator's "go through EVERY setting" goal depends on this).
                            lwSb.Append("]").Append(lwKids.Count > 200 ? ",\"childrenTruncated\":true" : "").Append("}");
                        }
                        lwSb.Append("],\"count\":").Append(lwN).Append("}");
                        Console.WriteLine(lwSb.ToString());
                        return 0;
                    }
                    case "setup-pages":
                    {
                        // U-CIMCO-SETUP-PAGES: map the CIMCO Setup property-sheet. Open it (--pre defaults to
                        // "Configure Machine Type"), find the #32770 + its SysTreeView32, walk every tree PAGE via
                        // HTREEITEM handles (TVM_GETNEXTITEM -- opaque handles, NO cross-process marshaling), select
                        // each (TVM_SELECTITEM), and Win32-enumerate that page's VISIBLE controls (AllChildHwnds ->
                        // active-page only). Maps EVERY CIMCO setting (the operator's "go through each setting") +
                        // locates the machine-config page for --load-machine. The only MSAA touch is the --pre fire.
                        if (string.IsNullOrEmpty(preCtl)) preCtl = "Configure Machine Type";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: setup-pages opens a dialog (UI action), requires --allow-actions")); return 3; }
                        string spPre = FireControl(ctls, preCtl);
                        Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
                        var st = FindSetupTree();
                        IntPtr spDlg = st.Key, spTree = st.Value;
                        if (spDlg == IntPtr.Zero || spTree == IntPtr.Zero)
                        { Console.WriteLine(Err(op, "no Setup #32770 with a SysTreeView32 after --pre '" + preCtl + "' (pre=" + spPre + ")")); return 2; }
                        var spItems = CollectTreeItems(spTree);
                        bool spPagesTrunc = spItems.Count >= 500;   // CollectTreeItems hard-caps at 500 -> fail-loud if clipped
                        var spSb = new StringBuilder();
                        spSb.Append("{\"ok\":true,\"op\":\"setup-pages\",\"pre\":\"").Append(Esc(spPre)).Append("\",\"dialog\":\"").Append(Hex(spDlg))
                            .Append("\",\"tree\":\"").Append(Hex(spTree)).Append("\",\"pageCount\":").Append(spItems.Count).Append(",\"pages\":[");
                        int spN = 0;
                        foreach (IntPtr it in spItems)
                        {
                            SendMessage(spTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, it);
                            Thread.Sleep(250); // let the page swap its controls in before we read the visible set
                            if (spN++ > 0) spSb.Append(',');
                            spSb.Append("{\"item\":\"").Append(Hex(it)).Append("\",\"controls\":[");
                            int spC = 0;
                            // AllChildHwnds is VISIBLE-only -> the active page (inactive pages are SW_HIDE'd). NOTE:
                            // this also carries the dialog's persistent CHROME (OK/Cancel/Default/Help + frame) on
                            // EVERY page -- the page-SPECIFIC controls still differ per page; the consumer filters chrome.
                            foreach (IntPtr ch in AllChildHwnds(spDlg))
                            {
                                if (ch == spTree) continue;              // skip the navigator tree itself
                                if (spC >= 250) break;
                                string ccls = ClassOf(ch), ctitle = WindowTitle(ch);
                                if (spC++ > 0) spSb.Append(',');
                                spSb.Append("{\"class\":\"").Append(Esc(ccls)).Append("\",\"title\":\"").Append(Esc(Trunc(ctitle, 120)))
                                    .Append("\",\"cid\":").Append(GetDlgCtrlID(ch)).Append("}");
                            }
                            spSb.Append("]").Append(spC >= 250 ? ",\"controlsTruncated\":true" : "").Append("}");
                        }
                        // Leave the tree on its first page so attach-mode never strands Setup on the last-walked page
                        // (selection only -- no OK/Apply, so nothing persists).
                        if (spItems.Count > 0) SendMessage(spTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, spItems[0]);
                        spSb.Append("]").Append(spPagesTrunc ? ",\"pagesTruncated\":true" : "").Append("}");
                        Console.WriteLine(spSb.ToString());
                        return 0;
                    }
                    case "read-setting":
                    {
                        // U-CIMCO-READ-SETTING: READ the live state of a Setup page's controls -- checkbox state via
                        // BM_GETCHECK (a READ message: no BM_CLICK/SETCHECK/SETTEXT, no OK -> nothing changes or
                        // persists). Opens Setup (--pre defaults "Configure Machine Type"), navigates to the page
                        // whose controls contain --name (substring of a control title), and reports every control +
                        // each checkbox's checked state. Win32-only (the only MSAA touch is the --pre fire).
                        // FIRST USE: --name "advanced simulation" -> reads 'Disable advanced simulation' (cid 14016);
                        // checked=false => the sim add-on is ACTIVE (Task #3 definitive confirm).
                        if (string.IsNullOrEmpty(name)) { Console.WriteLine(Err(op, "read-setting needs --name <control-title-hint>")); return 2; }
                        if (string.IsNullOrEmpty(preCtl)) preCtl = "Configure Machine Type";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: read-setting OPENS the Setup dialog (no write/persist), requires --allow-actions")); return 3; }
                        string rsPre = FireControl(ctls, preCtl);
                        Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
                        var rst = FindSetupTree();
                        IntPtr rsDlg = rst.Key, rsTree = rst.Value;
                        if (rsDlg == IntPtr.Zero || rsTree == IntPtr.Zero)
                        { Console.WriteLine(Err(op, "no Setup #32770 with a SysTreeView32 after --pre '" + preCtl + "' (pre=" + rsPre + ")")); return 2; }
                        string rsHint = name.ToLowerInvariant();
                        // Phase 1: walk ALL pages, record EVERY page whose controls contain the hint -> FAIL-CLOSED on
                        // ambiguity (consistent with FireControl/invoke's refuse-on-ambiguity), never silently read
                        // whichever page matched first. A read op's whole value is reporting the RIGHT setting's state.
                        var rsMatches = new List<IntPtr>();
                        foreach (IntPtr it in CollectTreeItems(rsTree))
                        {
                            SendMessage(rsTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, it);
                            Thread.Sleep(250); // let the page swap its controls in before we scan titles
                            foreach (IntPtr ch in AllChildHwnds(rsDlg))
                            { if (ch != rsTree && WindowTitle(ch).ToLowerInvariant().Contains(rsHint)) { rsMatches.Add(it); break; } }
                        }
                        // Restore the tree to root (selection only -- nothing persists) before any early return.
                        var rsRoot = SendMessage(rsTree, TVM_GETNEXTITEM, (IntPtr)TVGN_ROOT, IntPtr.Zero);
                        if (rsRoot != IntPtr.Zero) SendMessage(rsTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, rsRoot);
                        if (rsMatches.Count == 0)
                        { Console.WriteLine(Err(op, "no Setup page has a control whose title contains '" + name + "'")); return 2; }
                        if (rsMatches.Count > 1)
                        { Console.WriteLine(Err(op, "ambiguous: " + rsMatches.Count + " Setup pages contain a control matching '" + name + "' -- use a more specific hint")); return 2; }
                        // Phase 2: re-select the UNIQUE matched page and read its controls WHILE IT IS ACTIVE (robust
                        // against any hide-vs-destroy page-swap behavior -- we never read a swapped-away page).
                        IntPtr rsItem = rsMatches[0];
                        SendMessage(rsTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, rsItem);
                        Thread.Sleep(250);
                        var rsCtls = AllChildHwnds(rsDlg);
                        var rsSb = new StringBuilder();
                        rsSb.Append("{\"ok\":true,\"op\":\"read-setting\",\"pre\":\"").Append(Esc(rsPre)).Append("\",\"page\":\"").Append(Hex(rsItem)).Append("\",\"controls\":[");
                        int rsN = 0;
                        foreach (IntPtr ch in rsCtls)
                        {
                            if (ch == rsTree) continue;
                            if (rsN >= 250) break;
                            string ccls = ClassOf(ch), ctitle = WindowTitle(ch);
                            if (rsN++ > 0) rsSb.Append(',');
                            rsSb.Append("{\"class\":\"").Append(Esc(ccls)).Append("\",\"title\":\"").Append(Esc(Trunc(ctitle, 120)))
                                .Append("\",\"cid\":").Append(GetDlgCtrlID(ch));
                            if (IsCheckboxButton(ch, ccls))
                            {
                                long chk = SendMessage(ch, BM_GETCHECK, IntPtr.Zero, IntPtr.Zero).ToInt64();
                                rsSb.Append(",\"checked\":").Append(chk == 1 ? "true" : "false").Append(",\"checkState\":").Append(chk);
                            }
                            else if (IsCombo(ccls))   // report the combo's current selection (index + text) -- cross-process marshaled
                            {
                                var sel = ComboSelection(ch);
                                rsSb.Append(",\"selIndex\":").Append(sel.Key);
                                if (sel.Value != null) rsSb.Append(",\"selected\":\"").Append(Esc(Trunc(sel.Value, 200))).Append("\"");
                            }
                            rsSb.Append("}");
                        }
                        // Leave the tree neutral after the read too (selection only).
                        if (rsRoot != IntPtr.Zero) SendMessage(rsTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, rsRoot);
                        rsSb.Append("]").Append(rsN >= 250 ? ",\"controlsTruncated\":true" : "").Append("}");
                        Console.WriteLine(rsSb.ToString());
                        return 0;
                    }
                    case "set-setting":
                    {
                        // U-CIMCO-SET-SETTING: WRITE a Setup CHECKBOX to a target state. SAFE-BY-DEFAULT: apply ->
                        // READ-BACK-VERIFY -> DISCARD via Cancel (NOTHING persists) UNLESS --persist is given (then OK
                        // persists). Checkbox set = BM_CLICK only when current != desired (BM_CLICK sends BN_CLICKED so
                        // the dialog model updates + persists on OK; BM_SETCHECK would set only the visual). The dialog
                        // is ALWAYS closed (Cancel on every error/discard path) -- never left open. Win32-only (the only
                        // MSAA touch is the --pre fire). --name = page hint (unique), --cid = the control, --to = on/off.
                        // Currently checkbox-only; combo/edit (CB_SETCURSEL/WM_SETTEXT) is a documented follow-up.
                        if (string.IsNullOrEmpty(name)) { Console.WriteLine(Err(op, "set-setting needs --name <page-hint>")); return 2; }
                        if (targetCid < 0) { Console.WriteLine(Err(op, "set-setting needs --cid <control-id>")); return 2; }
                        bool? ssDesired = ParseDesiredBool(toVal);
                        if (ssDesired == null) { Console.WriteLine(Err(op, "set-setting needs --to <on|off|true|false|1|0>")); return 2; }
                        if (string.IsNullOrEmpty(preCtl)) preCtl = "Configure Machine Type";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: set-setting WRITES a control, requires --allow-actions")); return 3; }
                        string ssPre = FireControl(ctls, preCtl);
                        Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
                        var sst = FindSetupTree();
                        IntPtr ssDlg = sst.Key, ssTree = sst.Value;
                        if (ssDlg == IntPtr.Zero || ssTree == IntPtr.Zero)
                        { Console.WriteLine(Err(op, "no Setup #32770 with a SysTreeView32 after --pre '" + preCtl + "' (pre=" + ssPre + ")")); return 2; }
                        string ssHint = name.ToLowerInvariant();
                        // Phase 1: find the UNIQUE page matching the hint (fail-closed on ambiguity -- never write blind).
                        var ssMatches = new List<IntPtr>();
                        foreach (IntPtr it in CollectTreeItems(ssTree))
                        {
                            SendMessage(ssTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, it);
                            Thread.Sleep(250);
                            foreach (IntPtr ch in AllChildHwnds(ssDlg))
                            { if (ch != ssTree && WindowTitle(ch).ToLowerInvariant().Contains(ssHint)) { ssMatches.Add(it); break; } }
                        }
                        if (ssMatches.Count != 1)
                        {
                            CloseDialogViaButton(ssDlg, AllChildHwnds(ssDlg), ssTree, 2); // ALWAYS close (discard) -- no write attempted
                            Console.WriteLine(Err(op, (ssMatches.Count == 0 ? "no Setup page matches '" : ("ambiguous: " + ssMatches.Count + " pages match '")) + name + "' -- use a more specific hint"));
                            return 2;
                        }
                        // Phase 2: select the page, resolve the target control by cid, confirm it is a 2-state checkbox.
                        SendMessage(ssTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, ssMatches[0]);
                        Thread.Sleep(250);
                        var ssCtls = AllChildHwnds(ssDlg);
                        IntPtr ssTarget = FindByCid(ssCtls, ssTree, targetCid);
                        if (ssTarget == IntPtr.Zero || !IsCheckboxButton(ssTarget, ClassOf(ssTarget)) || IsThreeState(ssTarget))
                        {
                            string ssWhy = ssTarget == IntPtr.Zero ? ("cid " + targetCid + " not found on the matched page")
                                : IsThreeState(ssTarget) ? ("cid " + targetCid + " ('" + WindowTitle(ssTarget) + "') is a 3-state checkbox -- set-setting supports 2-state toggles only")
                                : ("cid " + targetCid + " ('" + WindowTitle(ssTarget) + "', " + ClassOf(ssTarget) + ") is not a checkbox -- set-setting supports checkbox toggles only");
                            CloseDialogViaButton(ssDlg, ssCtls, ssTree, 2); // ALWAYS close (discard)
                            Console.WriteLine(Err(op, ssWhy));
                            return 2;
                        }
                        string ssTitle = WindowTitle(ssTarget); // capture BEFORE the close destroys the hwnd
                        // Apply: toggle ONLY if current != desired (BM_CLICK = a real click -> model updates + persists on OK).
                        bool beforeChk = SendMessage(ssTarget, BM_GETCHECK, IntPtr.Zero, IntPtr.Zero).ToInt64() == 1;
                        if (beforeChk != ssDesired.Value) { SendMessage(ssTarget, BM_CLICK, IntPtr.Zero, IntPtr.Zero); Thread.Sleep(150); }
                        // Read-back-verify (fail-loud if the write did not take).
                        bool afterChk = SendMessage(ssTarget, BM_GETCHECK, IntPtr.Zero, IntPtr.Zero).ToInt64() == 1;
                        bool ssVerified = afterChk == ssDesired.Value;
                        // Persist or discard. DEFAULT = Cancel (nothing persists). --persist + verified -> OK. The dialog
                        // is ALWAYS closed (button or WM_CLOSE fallback); outcome fields reflect the REAL close, not intent.
                        bool wantPersist = persist && ssVerified;
                        bool ssViaButton = CloseDialogViaButton(ssDlg, ssCtls, ssTree, wantPersist ? 1 : 2);
                        bool ssPersisted = wantPersist && ssViaButton;             // R12: only true if OK actually fired
                        string ssClosedWith = !ssViaButton ? "WM_CLOSE" : (wantPersist ? "OK" : "Cancel");
                        Console.WriteLine("{\"ok\":true,\"op\":\"set-setting\",\"pre\":\"" + Esc(ssPre) + "\",\"cid\":" + targetCid
                            + ",\"title\":\"" + Esc(Trunc(ssTitle, 120)) + "\",\"before\":" + (beforeChk ? "true" : "false")
                            + ",\"desired\":" + (ssDesired.Value ? "true" : "false") + ",\"after\":" + (afterChk ? "true" : "false")
                            + ",\"verified\":" + (ssVerified ? "true" : "false") + ",\"persisted\":" + (ssPersisted ? "true" : "false")
                            + ",\"closedWith\":\"" + ssClosedWith + "\"}");
                        return ssVerified ? 0 : 1; // exit 1 (fail-loud) if the write did not verify
                    }
                    case "list-combo":
                    {
                        // U-CIMCO-COMBO-WRITE (read half): enumerate a Setup ComboBox's FULL option list + current
                        // selection (CB_GETCOUNT + CB_GETLBTEXT per index -- the option list read-setting CANNOT expose,
                        // per its own doc). READ-ONLY (no CB_SETCURSEL, no OK -> nothing changes/persists); the dialog is
                        // ALWAYS closed (Cancel). --name = page hint (unique), --cid = the ComboBox. Maps a machine NAME
                        // -> the index set-combo will select (cid 14307 "Machine setup:" / cid 14639 "Control Type:").
                        if (string.IsNullOrEmpty(name)) { Console.WriteLine(Err(op, "list-combo needs --name <page-hint>")); return 2; }
                        if (targetCid < 0) { Console.WriteLine(Err(op, "list-combo needs --cid <control-id>")); return 2; }
                        if (string.IsNullOrEmpty(preCtl)) preCtl = "Configure Machine Type";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: list-combo OPENS the Setup dialog (no write/persist), requires --allow-actions")); return 3; }
                        IntPtr lcDlg, lcTree, lcPage; string lcPre, lcErr;
                        if (!OpenSetupPage(ctls, preCtl, settle, name, out lcDlg, out lcTree, out lcPage, out lcPre, out lcErr))
                        { Console.WriteLine(Err(op, lcErr)); return 2; }
                        var lcCtls = AllChildHwnds(lcDlg);
                        IntPtr lcCombo = FindByCid(lcCtls, lcTree, targetCid);
                        if (lcCombo == IntPtr.Zero || !IsCombo(ClassOf(lcCombo)))
                        {
                            string lcWhy = lcCombo == IntPtr.Zero ? ("cid " + targetCid + " not found on the matched page")
                                : ("cid " + targetCid + " ('" + WindowTitle(lcCombo) + "', " + ClassOf(lcCombo) + ") is not a ComboBox");
                            CloseDialogViaButton(lcDlg, lcCtls, lcTree, 2); // discard -- read-only
                            Console.WriteLine(Err(op, lcWhy)); return 2;
                        }
                        var lcSel = ComboSelection(lcCombo);
                        int lcCount = ComboCount(lcCombo);
                        var lcSb = new StringBuilder();
                        lcSb.Append("{\"ok\":true,\"op\":\"list-combo\",\"pre\":\"").Append(Esc(lcPre)).Append("\",\"cid\":").Append(targetCid)
                            .Append(",\"count\":").Append(lcCount).Append(",\"current\":{\"index\":").Append(lcSel.Key)
                            .Append(",\"text\":\"").Append(Esc(Trunc(lcSel.Value == null ? "" : lcSel.Value, 200))).Append("\"},\"options\":[");
                        for (int i = 0; i < lcCount && i < 1000; i++)
                        {
                            if (i > 0) lcSb.Append(',');
                            lcSb.Append("{\"index\":").Append(i).Append(",\"text\":\"").Append(Esc(Trunc(ComboTextAt(lcCombo, i), 200))).Append("\"}");
                        }
                        lcSb.Append("]").Append(lcCount > 1000 ? ",\"optionsTruncated\":true" : "").Append("}");
                        // Restore tree to root + ALWAYS close (read-only discard -- never leave the modal open).
                        var lcRoot = SendMessage(lcTree, TVM_GETNEXTITEM, (IntPtr)TVGN_ROOT, IntPtr.Zero);
                        if (lcRoot != IntPtr.Zero) SendMessage(lcTree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, lcRoot);
                        CloseDialogViaButton(lcDlg, AllChildHwnds(lcDlg), lcTree, 2);
                        Console.WriteLine(lcSb.ToString());
                        return 0;
                    }
                    case "set-combo":
                    {
                        // U-CIMCO-COMBO-WRITE (write half): SELECT a Setup ComboBox item by NAME or index -- the .mcfg
                        // machine-load fidelity wire (cid 14307 "Machine setup:") + controller select (cid 14639 "Control
                        // Type:"). SAFE-BY-DEFAULT: CB_SETCURSEL -> notify the parent (WM_COMMAND/CBN_SELCHANGE so the
                        // dialog's data model registers the change, mirroring set-setting's BM_CLICK-not-BM_SETCHECK
                        // reasoning) -> READ-BACK-VERIFY (CB_GETCURSEL) -> DISCARD via Cancel UNLESS --persist (then OK
                        // persists). Dialog ALWAYS closed. --name = page hint (unique), --cid = the ComboBox, --to =
                        // target machine NAME (exact, else UNIQUE case-insensitive substring -- fail-closed) or an index.
                        if (string.IsNullOrEmpty(name)) { Console.WriteLine(Err(op, "set-combo needs --name <page-hint>")); return 2; }
                        if (targetCid < 0) { Console.WriteLine(Err(op, "set-combo needs --cid <control-id>")); return 2; }
                        if (string.IsNullOrEmpty(toVal)) { Console.WriteLine(Err(op, "set-combo needs --to <machine-name-or-index>")); return 2; }
                        if (string.IsNullOrEmpty(preCtl)) preCtl = "Configure Machine Type";
                        if (!allowActions) { Console.WriteLine(Err(op, "refused: set-combo WRITES a control, requires --allow-actions")); return 3; }
                        IntPtr scDlg, scTree, scPage; string scPre, scErr;
                        if (!OpenSetupPage(ctls, preCtl, settle, name, out scDlg, out scTree, out scPage, out scPre, out scErr))
                        { Console.WriteLine(Err(op, scErr)); return 2; }
                        var scCtls = AllChildHwnds(scDlg);
                        IntPtr scCombo = FindByCid(scCtls, scTree, targetCid);
                        if (scCombo == IntPtr.Zero || !IsCombo(ClassOf(scCombo)))
                        {
                            string scWhy = scCombo == IntPtr.Zero ? ("cid " + targetCid + " not found on the matched page")
                                : ("cid " + targetCid + " ('" + WindowTitle(scCombo) + "', " + ClassOf(scCombo) + ") is not a ComboBox");
                            CloseDialogViaButton(scDlg, scCtls, scTree, 2); // ALWAYS close (discard) -- no write attempted
                            Console.WriteLine(Err(op, scWhy)); return 2;
                        }
                        var scBefore = ComboSelection(scCombo);
                        string scResolveWhy;
                        int scTarget = ResolveComboTarget(scCombo, toVal, out scResolveWhy);
                        if (scTarget < 0)
                        {
                            CloseDialogViaButton(scDlg, scCtls, scTree, 2); // ALWAYS close (discard) -- target unresolved
                            Console.WriteLine(Err(op, scResolveWhy)); return 2;
                        }
                        string scTargetText = ComboTextAt(scCombo, scTarget);
                        // Apply ONLY if changing. CB_SETCURSEL sets the selection but does NOT notify the parent (only a
                        // USER selection sends CBN_SELCHANGE), so we post WM_COMMAND(CBN_SELCHANGE) to the parent dialog
                        // so CIMCO's model registers the new machine on OK -- the combo analog of set-setting using
                        // BM_CLICK (model-updating) rather than BM_SETCHECK (visual-only).
                        bool scChanged = scBefore.Key != scTarget;
                        bool scNotifyDelivered = !scChanged; // no change -> nothing to notify (vacuously delivered)
                        if (scChanged)
                        {
                            SendMessage(scCombo, CB_SETCURSEL, (IntPtr)scTarget, IntPtr.Zero);
                            IntPtr scParent = GetParent(scCombo);
                            if (scParent != IntPtr.Zero)
                            {
                                IntPtr scWp = (IntPtr)(((CBN_SELCHANGE & 0xFFFF) << 16) | (targetCid & 0xFFFF));
                                SendMessage(scParent, WM_COMMAND, scWp, scCombo);
                                scNotifyDelivered = true;
                            }
                            Thread.Sleep(150);
                        }
                        // Read-back-verify. verified requires BOTH the index landed AND -- when a change was made -- the
                        // CBN_SELCHANGE reached the parent: CB_SETCURSEL alone updates only the VISUAL selection, so if
                        // the parent notify could not be delivered (GetParent==Zero) the dialog's data model may not
                        // register the change on OK. Refusing to call that "verified" stops --persist from saving a
                        // visual-only selection (fail-loud: exit 1 + persisted=false).
                        int scAfterIdx = (int)SendMessage(scCombo, CB_GETCURSEL, IntPtr.Zero, IntPtr.Zero).ToInt64();
                        bool scVerified = scAfterIdx == scTarget && scNotifyDelivered;
                        // Persist or discard. DEFAULT = Cancel (nothing persists). --persist + verified -> OK. The dialog
                        // is ALWAYS closed; `persisted`/`closedWith` reflect the REAL close, never intent.
                        bool scWantPersist = persist && scVerified;
                        bool scViaButton = CloseDialogViaButton(scDlg, AllChildHwnds(scDlg), scTree, scWantPersist ? 1 : 2);
                        bool scPersisted = scWantPersist && scViaButton;
                        string scClosedWith = !scViaButton ? "WM_CLOSE" : (scWantPersist ? "OK" : "Cancel");
                        var scSb = new StringBuilder();
                        scSb.Append("{\"ok\":true,\"op\":\"set-combo\",\"pre\":\"").Append(Esc(scPre)).Append("\",\"cid\":").Append(targetCid)
                            .Append(",\"before\":{\"index\":").Append(scBefore.Key).Append(",\"text\":\"").Append(Esc(Trunc(scBefore.Value == null ? "" : scBefore.Value, 200))).Append("\"}")
                            .Append(",\"target\":{\"index\":").Append(scTarget).Append(",\"text\":\"").Append(Esc(Trunc(scTargetText, 200))).Append("\"}")
                            .Append(",\"afterIndex\":").Append(scAfterIdx).Append(",\"notifyDelivered\":").Append(scNotifyDelivered ? "true" : "false")
                            .Append(",\"verified\":").Append(scVerified ? "true" : "false")
                            .Append(",\"persisted\":").Append(scPersisted ? "true" : "false").Append(",\"closedWith\":\"").Append(scClosedWith).Append("\"}");
                        Console.WriteLine(scSb.ToString());
                        return scVerified ? 0 : 1; // exit 1 (fail-loud) if the selection did not verify
                    }
                    default: Console.WriteLine(Err(op, "unknown op")); return 2;
                }
            }
            catch (Exception e) { Console.WriteLine(Err(op, e.GetType().Name + ": " + e.Message)); return 1; }
            finally
            {
                // Kill ONLY the pids WE started (the snapshot-diff above) - never a peer fleet-slot's CIMCO or
                // the operator's manually-opened editor. If /ms forwarded to a pre-existing instance, ownedPids
                // is empty and nothing is killed.
                if (launchedHere && !keep)
                    foreach (int pid in ownedPids)
                        { try { Process.GetProcessById(pid).Kill(); } catch { } }
            }
        }

        // ---- MSAA tree walk ----
        private sealed class Ctl { public string Name, Role, Da, Path; public IAccessible Acc; public object ChildId; }

        private static void Walk(IAccessible acc, string path, int depth, int maxDepth, List<Ctl> outp)
        {
            if (acc == null || depth > maxDepth || outp.Count > 8000) return;
            int cnt; try { cnt = acc.accChildCount; } catch { return; }
            if (cnt <= 0 || cnt > 20000) return;
            object[] kids = new object[cnt];
            int got;
            try { AccessibleChildren(acc, 0, cnt, kids, out got); } catch { return; }
            for (int i = 0; i < got; i++)
            {
                object c = kids[i];
                if (c == null) continue;
                if (c is int)
                {
                    int cid = (int)c;
                    string nm = SafeName(acc, cid);
                    if (!string.IsNullOrEmpty(nm))
                        outp.Add(new Ctl { Name = nm, Role = SafeRole(acc, cid), Da = SafeDa(acc, cid), Path = path, Acc = acc, ChildId = cid });
                }
                else
                {
                    IAccessible cia = c as IAccessible;
                    if (cia == null) continue;
                    string nm = SafeName(cia, 0);
                    if (!string.IsNullOrEmpty(nm))
                        outp.Add(new Ctl { Name = nm, Role = SafeRole(cia, 0), Da = SafeDa(cia, 0), Path = path, Acc = cia, ChildId = (object)0 });
                    int ccnt; try { ccnt = cia.accChildCount; } catch { ccnt = 0; }
                    if (ccnt > 0) Walk(cia, path + ">" + (string.IsNullOrEmpty(nm) ? "?" : nm), depth + 1, maxDepth, outp);
                }
            }
        }

        private static string SafeName(IAccessible a, object child) { try { return a.get_accName(child) ?? ""; } catch { return ""; } }
        private static string SafeDa(IAccessible a, object child) { try { return a.get_accDefaultAction(child) ?? ""; } catch { return ""; } }
        private static string SafeRole(IAccessible a, object child)
        {
            try { object r = a.get_accRole(child); return RoleName(r is int ? (int)r : -1); } catch { return "?"; }
        }
        private static string RoleName(int r)
        {
            switch (r)
            {
                case 0x0A: return "client"; case 0x16: return "toolbar"; case 0x2B: return "pushbutton";
                case 0x25: return "pagetab"; case 0x3C: return "pagetablist"; case 0x0C: return "menuitem";
                case 0x02: return "titlebar"; case 0x03: return "menubar"; case 0x09: return "window";
                case 0x14: return "grouping"; case 0x1E: return "statictext"; case 0x15: return "separator";
                case 0x0D: return "outline"; case 0x21: return "list"; case 0x22: return "listitem";
                default: return r >= 0 ? ("r" + r) : "?";
            }
        }

        // ---- output ----
        private static string MapJson(IntPtr frame, List<Ctl> ctls, string filter)
        {
            var seen = new HashSet<string>();
            var sb = new StringBuilder();
            sb.Append("{\"ok\":true,\"op\":\"").Append(filter == null ? "map" : "find").Append("\",\"frame\":\"").Append(Hex(frame)).Append("\",\"controls\":[");
            int n = 0; string lf = filter == null ? null : filter.ToLowerInvariant();
            foreach (var c in ctls)
            {
                if (lf != null && (c.Name == null || !c.Name.ToLowerInvariant().Contains(lf))) continue;
                string key = c.Name + "" + c.Path + "" + c.Role;
                if (!seen.Add(key)) continue;
                if (n++ > 0) sb.Append(',');
                sb.Append("{\"name\":\"").Append(Esc(Trunc(c.Name, 200))).Append("\",\"role\":\"").Append(Esc(c.Role))
                  .Append("\",\"da\":\"").Append(Esc(Trunc(c.Da, 80))).Append("\",\"cid\":").Append(c.ChildId is int ? (int)c.ChildId : 0)
                  .Append(",\"path\":\"").Append(Esc(Trunc(c.Path, 300))).Append("\"}");
            }
            sb.Append("],\"count\":").Append(n).Append(",\"walked\":").Append(ctls.Count).Append("}");
            return sb.ToString();
        }
        // Resolve a control by name (exact accName first, else UNIQUE substring -- refuse on ambiguity), deny-check
        // it against MotionDeny, then fire accDoDefaultAction on a worker thread with a Join timeout. Returns a state
        // string: "fired" | "threw:<msg>" | "blocked" (modal, never returned) | "no-match:<n>" | "ambiguous:<n>" |
        // "denied:<resolved>". Used by invoke-read for its open->run chain. Unlike --op invoke it NEVER Environment.Exit
        // on a block -- a modal (the running sim) is expected and the caller must still read the report afterward.
        private static string FireControl(List<Ctl> ctls, string name)
        {
            if (string.IsNullOrEmpty(name)) return "no-match:";
            string ln = name.ToLowerInvariant();
            Ctl hit = null; var subs = new List<Ctl>();
            foreach (var c in ctls)
            {
                if (c.Name == null) continue;
                string cl = c.Name.ToLowerInvariant();
                if (cl == ln && hit == null) hit = c;
                if (cl.Contains(ln)) subs.Add(c);
            }
            if (hit == null)
            {
                if (subs.Count == 0) return "no-match:" + name;
                if (subs.Count > 1) return "ambiguous:" + name;
                hit = subs[0];
            }
            if (Array.Exists(MotionDeny, d => hit.Name.ToLowerInvariant().Contains(d))) return "denied:" + hit.Name;
            string err = null; bool ret = false, threw = false;
            var t = new Thread(() => { try { hit.Acc.accDoDefaultAction(hit.ChildId); ret = true; } catch (Exception e) { threw = true; err = e.Message; } });
            t.IsBackground = true; t.Start(); t.Join(8000);
            return threw ? ("threw:" + err) : ret ? "fired" : "blocked";
        }

        private static string Err(string op, string msg) { return "{\"ok\":false,\"op\":\"" + Esc(op) + "\",\"error\":\"" + Esc(msg) + "\"}"; }
        private static string Esc(string s)
        {
            if (string.IsNullOrEmpty(s)) return "";
            var sb = new StringBuilder(s.Length + 8);
            for (int i = 0; i < s.Length; i++)
            {
                char c = s[i];
                // Lone surrogates are invalid UTF-8/JSON and make JSON.parse throw on the node side. Pass a
                // valid surrogate PAIR through; replace any lone surrogate with U+FFFD (MSAA names occasionally
                // carry stray surrogates).
                if (char.IsHighSurrogate(c))
                {
                    if (i + 1 < s.Length && char.IsLowSurrogate(s[i + 1])) { sb.Append(c).Append(s[i + 1]); i++; }
                    else sb.Append('?');
                    continue;
                }
                if (char.IsLowSurrogate(c)) { sb.Append('?'); continue; }
                switch (c)
                {
                    case '"': sb.Append("\\\""); break;
                    case '\\': sb.Append("\\\\"); break;
                    case '\n': sb.Append("\\n"); break;
                    case '\r': sb.Append("\\r"); break;
                    case '\t': sb.Append("\\t"); break;
                    default: if (c < 0x20) sb.Append("\\u").Append(((int)c).ToString("x4")); else sb.Append(c); break;
                }
            }
            return sb.ToString();
        }
        private static string Trunc(string s, int max) { return (s != null && s.Length > max) ? s.Substring(0, max) : s; }
        private static bool HasControlChar(string s) { if (s == null) return false; foreach (char c in s) if (c < 0x20) return true; return false; }
        private static string Hex(IntPtr p) { return "0x" + p.ToInt64().ToString("x"); }

        // ---- Win32 window location ----
        private delegate bool EnumProc(IntPtr h, IntPtr l);
        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc cb, IntPtr l);
        [DllImport("user32.dll")] private static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr l);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr h, StringBuilder s, int max);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr h, StringBuilder s, int max);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr h);
        [DllImport("user32.dll")] private static extern int GetDlgCtrlID(IntPtr h);
        [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
        [DllImport("user32.dll")] private static extern IntPtr GetParent(IntPtr hWnd); // set-combo: parent dialog for the CBN_SELCHANGE notify
        // SendMessage for TreeView navigation. We use ONLY the HTREEITEM-handle messages (TVM_GETNEXTITEM /
        // TVM_SELECTITEM) -- both take/return an opaque HTREEITEM as wParam/lParam/return, so there is NO
        // cross-process struct marshaling or ReadProcessMemory (the fiddly, AV-prone part of reading TreeView text).
        [DllImport("user32.dll", CharSet = CharSet.Auto)] private static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
        // String-buffer overload for the OS-marshaled combo/listbox text messages (CB_GETLBTEXT etc. ARE marshaled
        // cross-process by the window-message system, like WM_GETTEXT -- no manual ReadProcessMemory needed).
        [DllImport("user32.dll", EntryPoint = "SendMessageW", CharSet = CharSet.Unicode)] private static extern IntPtr SendMessageStr(IntPtr hWnd, uint Msg, IntPtr wParam, StringBuilder lParam);
        private const uint CB_GETCURSEL = 0x0147, CB_GETLBTEXT = 0x0148, CB_GETLBTEXTLEN = 0x0149;
        // list-combo / set-combo: CB_GETCOUNT (item count), CB_SETCURSEL (select by index). CB_SETCURSEL alone does
        // NOT notify the parent, so set-combo posts WM_COMMAND(HIWORD=CBN_SELCHANGE, LOWORD=cid, lParam=combo) to the
        // parent dialog -- the user-selection notification CIMCO's model needs to register the new machine on OK.
        private const uint CB_GETCOUNT = 0x0146, CB_SETCURSEL = 0x014E, WM_COMMAND = 0x0111;
        private const int CBN_SELCHANGE = 1;
        private const uint TVM_GETNEXTITEM = 0x110A, TVM_SELECTITEM = 0x110B;
        private const int TVGN_ROOT = 0x0000, TVGN_NEXT = 0x0001, TVGN_CHILD = 0x0004, TVGN_CARET = 0x0009;
        // read-setting: BM_GETCHECK is a READ message (no state change). Button-style detection distinguishes a
        // checkbox/radio (whose check-state is meaningful) from a plain pushbutton (BM_GETCHECK returns 0 always).
        private const uint BM_GETCHECK = 0x00F0;
        // BM_CLICK simulates a click -> sends BN_CLICKED so the dialog's data model updates (BM_SETCHECK only sets
        // the visual and would NOT persist on OK). Used by set-setting to TOGGLE a checkbox to a target state.
        private const uint BM_CLICK = 0x00F5;
        private const uint WM_CLOSE = 0x0010; // a #32770 treats WM_CLOSE as Cancel -> DISCARD (safe close fallback)
        private const int GWL_STYLE = -16;
        [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")] private static extern IntPtr GetWindowLongPtr(IntPtr hWnd, int nIndex);
        private static bool IsCheckboxButton(IntPtr h, string cls)
        {
            if (cls != "Button") return false;
            long s = GetWindowLongPtr(h, GWL_STYLE).ToInt64() & 0x0F; // BS_TYPEMASK
            return s == 0x02 || s == 0x03 || s == 0x04 || s == 0x05 || s == 0x06 || s == 0x09; // (auto)checkbox/radio/3state
        }
        // Parse a desired checkbox target. Returns null if unrecognized (caller fail-closes).
        private static bool? ParseDesiredBool(string v)
        {
            if (string.IsNullOrEmpty(v)) return null;
            switch (v.Trim().ToLowerInvariant())
            {
                case "1": case "true": case "on": case "yes": case "checked": case "check": return true;
                case "0": case "false": case "off": case "no": case "unchecked": case "uncheck": return false;
                default: return null;
            }
        }
        // First control with dialog-id == cid (skipping the tree), or Zero.
        private static IntPtr FindByCid(List<IntPtr> ctls, IntPtr skip, int cid)
        {
            foreach (IntPtr ch in ctls) { if (ch != skip && GetDlgCtrlID(ch) == cid) return ch; }
            return IntPtr.Zero;
        }
        private static bool IsCombo(string cls) { return cls == "ComboBox" || cls == "ComboBoxEx32"; }
        // Read a ComboBox's CURRENT selection (index + text) cross-process. CB_GETLBTEXT is an OS-marshaled message,
        // so the text comes back across the process boundary without manual ReadProcessMemory. (-1,null) = no selection.
        private static KeyValuePair<int, string> ComboSelection(IntPtr h)
        {
            int idx = (int)SendMessage(h, CB_GETCURSEL, IntPtr.Zero, IntPtr.Zero).ToInt64(); // .ToInt64 matches the BM_GETCHECK idiom
            if (idx < 0) return new KeyValuePair<int, string>(-1, null); // CB_ERR -> nothing selected
            int len = (int)SendMessage(h, CB_GETLBTEXTLEN, (IntPtr)idx, IntPtr.Zero).ToInt64();
            if (len <= 0 || len > 4096) return new KeyValuePair<int, string>(idx, "");
            var sb = new StringBuilder(len + 1);
            SendMessageStr(h, CB_GETLBTEXT, (IntPtr)idx, sb);
            return new KeyValuePair<int, string>(idx, sb.ToString());
        }
        // Item count of a ComboBox (CB_GETCOUNT). CB_ERR (-1) -> 0.
        private static int ComboCount(IntPtr h)
        {
            int n = (int)SendMessage(h, CB_GETCOUNT, IntPtr.Zero, IntPtr.Zero).ToInt64();
            return n < 0 ? 0 : n;
        }
        // Text of item i in a ComboBox (CB_GETLBTEXTLEN + CB_GETLBTEXT, OS-marshaled cross-process like
        // ComboSelection -- no manual ReadProcessMemory). "" on error/empty/over-long.
        private static string ComboTextAt(IntPtr h, int i)
        {
            int len = (int)SendMessage(h, CB_GETLBTEXTLEN, (IntPtr)i, IntPtr.Zero).ToInt64();
            if (len <= 0 || len > 4096) return "";
            var sb = new StringBuilder(len + 1);
            SendMessageStr(h, CB_GETLBTEXT, (IntPtr)i, sb);
            return sb.ToString();
        }
        // Resolve a set-combo --to target to a ComboBox item index. A pure integer is taken as the index
        // (range-checked); otherwise the item TEXT is matched -- EXACT (case-insensitive) first, else a UNIQUE
        // case-insensitive SUBSTRING. Fail-closed (-1 + why) on no-match OR ambiguous-substring so set-combo
        // NEVER loads the wrong machine on a partial name. why is set only on failure.
        private static int ResolveComboTarget(IntPtr h, string target, out string why)
        {
            why = null;
            int count = ComboCount(h);
            if (count <= 0) { why = "combo has no items"; return -1; }
            int idx;
            if (int.TryParse(target.Trim(), out idx))
            {
                if (idx < 0 || idx >= count) { why = "index " + idx + " out of range [0," + (count - 1) + "]"; return -1; }
                return idx;
            }
            string t = target.Trim().ToLowerInvariant();
            for (int i = 0; i < count; i++)
            { if (ComboTextAt(h, i).ToLowerInvariant() == t) return i; }       // exact (case-insensitive) wins
            var subs = new List<int>();
            for (int i = 0; i < count; i++)
            { if (ComboTextAt(h, i).ToLowerInvariant().Contains(t)) subs.Add(i); }
            if (subs.Count == 1) return subs[0];
            if (subs.Count == 0) { why = "no combo item matches '" + target + "'"; return -1; }
            why = "ambiguous: " + subs.Count + " combo items contain '" + target + "' -- use a more specific name or an index"; return -1;
        }
        // Shared Setup-page navigation for the combo ops: open Setup (--pre), find the #32770 + its SysTreeView32,
        // and select the UNIQUE page whose visible controls contain `hint` (fail-closed on 0/>1 -- never act blind).
        // On success returns true with dlg/tree/page set and the page SELECTED (dialog LEFT OPEN -- the caller MUST
        // close it). On failure returns false, sets err, and closes any opened dialog. Mirrors read-setting /
        // set-setting Phase-1 exactly (extracted so the new ops share it without touching the proven existing ops).
        private static bool OpenSetupPage(List<Ctl> ctls, string preCtl, int settle, string hint,
            out IntPtr dlg, out IntPtr tree, out IntPtr page, out string pre, out string err)
        {
            dlg = IntPtr.Zero; tree = IntPtr.Zero; page = IntPtr.Zero; err = null;
            pre = FireControl(ctls, preCtl);
            Thread.Sleep((settle < 1 ? 1 : settle) * 1000);
            var st = FindSetupTree();
            dlg = st.Key; tree = st.Value;
            if (dlg == IntPtr.Zero || tree == IntPtr.Zero)
            {
                // Never leak a modal: if --pre opened a dialog that ISN'T the tree'd Setup sheet (wrong surface),
                // WM_CLOSE it (= Cancel/discard) before failing. (The read-setting/set-setting templates omit this --
                // a pre-existing shared gap to backport.)
                if (dlg != IntPtr.Zero) SendMessage(dlg, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
                err = "no Setup #32770 with a SysTreeView32 after --pre '" + preCtl + "' (pre=" + pre + ")"; return false;
            }
            string h = hint.ToLowerInvariant();
            var matches = new List<IntPtr>();
            foreach (IntPtr it in CollectTreeItems(tree))
            {
                SendMessage(tree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, it);
                Thread.Sleep(250); // let the page swap its controls in before scanning titles
                foreach (IntPtr ch in AllChildHwnds(dlg))
                { if (ch != tree && WindowTitle(ch).ToLowerInvariant().Contains(h)) { matches.Add(it); break; } }
            }
            if (matches.Count != 1)
            {
                CloseDialogViaButton(dlg, AllChildHwnds(dlg), tree, 2); // ALWAYS close (discard) -- never act blind
                err = (matches.Count == 0 ? "no Setup page matches '" : ("ambiguous: " + matches.Count + " pages match '")) + hint + "' -- use a more specific hint";
                return false;
            }
            page = matches[0];
            SendMessage(tree, TVM_SELECTITEM, (IntPtr)TVGN_CARET, page);
            Thread.Sleep(250);
            return true;
        }
        // A 3-state checkbox (BS_3STATE/BS_AUTO3STATE) -- excluded from set-setting (its boolean toggle model can't
        // represent the indeterminate state; read-setting still reports it via checkState).
        private static bool IsThreeState(IntPtr h)
        {
            long s = GetWindowLongPtr(h, GWL_STYLE).ToInt64() & 0x0F;
            return s == 0x05 || s == 0x06;
        }
        // Close a #32770: click the button with `cid` if it can be located, else fall back to WM_CLOSE (= Cancel /
        // discard). Guarantees the dialog is ALWAYS closed by construction. Returns true IFF the requested button
        // was actually clicked (so the caller can report the REAL outcome -- a WM_CLOSE fallback never persists).
        private static bool CloseDialogViaButton(IntPtr dlg, List<IntPtr> ctls, IntPtr skip, int cid)
        {
            IntPtr btn = FindByCid(ctls, skip, cid);
            if (btn != IntPtr.Zero) { SendMessage(btn, BM_CLICK, IntPtr.Zero, IntPtr.Zero); return true; }
            SendMessage(dlg, WM_CLOSE, IntPtr.Zero, IntPtr.Zero); // safe discard when the button hwnd isn't enumerable
            return false;
        }
        [DllImport("oleacc.dll")] private static extern int AccessibleObjectFromWindow(IntPtr hwnd, uint id, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out IAccessible acc);
        [DllImport("oleacc.dll")] private static extern int AccessibleChildren(IAccessible acc, int start, int count, [Out] object[] kids, out int got);

        private static string ClassOf(IntPtr h) { var sb = new StringBuilder(256); GetClassName(h, sb, 256); return sb.ToString(); }
        private static string WindowTitle(IntPtr h) { var sb = new StringBuilder(512); GetWindowText(h, sb, 512); return sb.ToString(); }

        private static IntPtr FindFrame()
        {
            IntPtr found = IntPtr.Zero;
            EnumWindows((h, l) =>
            {
                if (!IsWindowVisible(h)) return true;
                if (ClassOf(h) == "XTPMainFrame") { found = h; return false; }
                return true;
            }, IntPtr.Zero);
            return found;
        }
        private static List<KeyValuePair<string, IntPtr>> ChildHwndsByClass(IntPtr parent, string[] classes)
        {
            var res = new List<KeyValuePair<string, IntPtr>>();
            EnumChildWindows(parent, (h, l) =>
            {
                string cn = ClassOf(h);
                if (Array.IndexOf(classes, cn) >= 0) res.Add(new KeyValuePair<string, IntPtr>(cn, h));
                return true;
            }, IntPtr.Zero);
            return res;
        }

        private static string Next(string[] a, ref int i) { return (i + 1 < a.Length) ? a[++i] : ""; }

        // ---- read-report: value-aware MSAA walk of the Simulation-Report docking pane ----
        private sealed class RNode { public string Name, Value, Role, Path; public IAccessible Acc; public object ChildId; }

        // Like Walk, but (a) captures accValue (grid cells carry text there) and (b) KEEPS a node when Name
        // OR Value is non-empty (Walk drops empty-name nodes -> it would silently lose value-only cells).
        private static void WalkReport(IAccessible acc, string path, int depth, int maxDepth, List<RNode> outp)
        {
            if (acc == null || depth > maxDepth || outp.Count > 12000) return;
            int cnt; try { cnt = acc.accChildCount; } catch { return; }
            if (cnt <= 0 || cnt > 20000) return;
            object[] kids = new object[cnt];
            int got;
            try { AccessibleChildren(acc, 0, cnt, kids, out got); } catch { return; }
            for (int i = 0; i < got; i++)
            {
                object c = kids[i];
                if (c == null) continue;
                if (c is int)
                {
                    int cid = (int)c;
                    string nm = SafeName(acc, cid), val = SafeValue(acc, cid);
                    if (!string.IsNullOrEmpty(nm) || !string.IsNullOrEmpty(val))
                        outp.Add(new RNode { Name = nm, Value = val, Role = SafeRole(acc, cid), Path = path, Acc = acc, ChildId = cid });
                }
                else
                {
                    IAccessible cia = c as IAccessible;
                    if (cia == null) continue;
                    string nm = SafeName(cia, 0), val = SafeValue(cia, 0);
                    if (!string.IsNullOrEmpty(nm) || !string.IsNullOrEmpty(val))
                        outp.Add(new RNode { Name = nm, Value = val, Role = SafeRole(cia, 0), Path = path, Acc = cia, ChildId = (object)0 });
                    int ccnt; try { ccnt = cia.accChildCount; } catch { ccnt = 0; }
                    if (ccnt > 0) WalkReport(cia, path + ">" + (string.IsNullOrEmpty(nm) ? "?" : nm), depth + 1, maxDepth, outp);
                }
            }
        }

        private static string SafeValue(IAccessible a, object child) { try { return a.get_accValue(child) ?? ""; } catch { return ""; } }

        // All visible descendant windows of the frame (the report pane is a docking child window whose
        // IAccessible tree the frame-client walk does not necessarily cross into).
        private static List<IntPtr> AllChildHwnds(IntPtr parent)
        {
            var res = new List<IntPtr>();
            EnumChildWindows(parent, (h, l) => { if (IsWindowVisible(h)) res.Add(h); return true; }, IntPtr.Zero);
            return res;
        }

        // ---- list-windows recon helpers (Win32-ONLY; no MSAA -> AV-safe) ----
        // Every visible TOP-LEVEL window (used to spot a config/file dialog after firing its ribbon control).
        private static List<IntPtr> TopLevelWindows()
        {
            var res = new List<IntPtr>();
            EnumWindows((h, l) => { if (IsWindowVisible(h)) res.Add(h); return true; }, IntPtr.Zero);
            return res;
        }
        // Every descendant window of a dialog (EnumChildWindows recurses) -> the filename Edit + Open button etc.
        // Defensively capped at 4000 so a pathological host window can never build an unbounded list.
        private static List<IntPtr> ChildWindowsAll(IntPtr parent)
        {
            var res = new List<IntPtr>();
            EnumChildWindows(parent, (h, l) => { res.Add(h); return res.Count < 4000; }, IntPtr.Zero);
            return res;
        }

        // ---- setup-pages: locate + walk the CIMCO Setup property-sheet's SysTreeView32 (HTREEITEM handles only) ----
        // The first SysTreeView32 descendant of a dialog, or Zero.
        private static IntPtr TreeChildOf(IntPtr dlg)
        {
            IntPtr t = IntPtr.Zero;
            EnumChildWindows(dlg, (c, ll) => { if (ClassOf(c) == "SysTreeView32") { t = c; return false; } return true; }, IntPtr.Zero);
            return t;
        }
        // Find a visible #32770 dialog that contains a SysTreeView32 -> the global Setup property-sheet.
        // Returns (dialogHwnd, treeHwnd); either is Zero if none is open. PREFERS the FOREGROUND window -- the
        // Setup dialog we just opened via --pre is foreground, so we bind the RIGHT dialog even if a stale/other
        // #32770-with-a-tree is also open (the EnumWindows first-match fallback is Z-order nondeterministic).
        private static KeyValuePair<IntPtr, IntPtr> FindSetupTree()
        {
            IntPtr fg = GetForegroundWindow();
            if (fg != IntPtr.Zero && IsWindowVisible(fg) && ClassOf(fg) == "#32770")
            {
                IntPtr ft = TreeChildOf(fg);
                if (ft != IntPtr.Zero) return new KeyValuePair<IntPtr, IntPtr>(fg, ft);
            }
            IntPtr dlg = IntPtr.Zero, tree = IntPtr.Zero;
            EnumWindows((h, l) =>
            {
                if (!IsWindowVisible(h) || ClassOf(h) != "#32770") return true;
                IntPtr t = TreeChildOf(h);
                if (t != IntPtr.Zero) { dlg = h; tree = t; return false; }
                return true;
            }, IntPtr.Zero);
            return new KeyValuePair<IntPtr, IntPtr>(dlg, tree);
        }
        // Walk every HTREEITEM (root -> children -> siblings) via TVM_GETNEXTITEM. Opaque-handle only -- no
        // cross-process struct read. Deduped + bounded at 500 so a cyclic/huge tree can never loop forever.
        private static List<IntPtr> CollectTreeItems(IntPtr tree)
        {
            var items = new List<IntPtr>();
            var seen = new HashSet<IntPtr>();
            IntPtr root = SendMessage(tree, TVM_GETNEXTITEM, (IntPtr)TVGN_ROOT, IntPtr.Zero);
            var stack = new Stack<IntPtr>();
            if (root != IntPtr.Zero) stack.Push(root);
            while (stack.Count > 0 && items.Count < 500)
            {
                IntPtr it = stack.Pop();
                if (it == IntPtr.Zero || !seen.Add(it)) continue;
                items.Add(it);
                IntPtr next = SendMessage(tree, TVM_GETNEXTITEM, (IntPtr)TVGN_NEXT, it);
                if (next != IntPtr.Zero && !seen.Contains(next)) stack.Push(next);
                IntPtr child = SendMessage(tree, TVM_GETNEXTITEM, (IntPtr)TVGN_CHILD, it);
                if (child != IntPtr.Zero && !seen.Contains(child)) stack.Push(child);
            }
            return items;
        }

        // Container-role: be GENEROUS (the live report-grid role is unproven) but rely on the name-hint
        // filter to constrain. Over-accepting a candidate is safe — the Node normalizer rejects a container
        // whose nodes do not form a LINE/TYPE/DESC grid (fail-closed -> source:opaque), never a clean pass.
        private static bool IsContainerRole(string role)
        {
            switch (role) { case "list": case "outline": case "grouping": case "window": case "client": case "toolbar": return true; }
            return role == "r24" || role == "r28" || role == "r29" || role == "r33" || role == "r35" || role == "r18"; // table/row/cell/grid-ish
        }

        // Report-name hints, strongest first. A label (statictext) is filtered out by IsContainerRole; the
        // densest container (the grid, not a stray "Output" pane) wins the tie.
        private static readonly string[] ReportNameHints = { "simulation report", "machine simulation report", "sim report", "verification report", "collision", "report", "result", "messages", "warnings", "errors", "output" };

        private static RNode FindReportContainer(List<RNode> nodes, string nameOverride)
        {
            // Operator may pass --name "<exact pane name>" once the live name is known (the reliable path).
            if (!string.IsNullOrEmpty(nameOverride))
            {
                string lo = nameOverride.ToLowerInvariant();
                RNode pick = null;
                foreach (var n in nodes)
                    if (n.Name != null && n.Name.ToLowerInvariant().Contains(lo) && IsContainerRole(n.Role))
                        if (pick == null || ChildSpan(nodes, n) > ChildSpan(nodes, pick)) pick = n;
                if (pick != null) return pick;
            }
            RNode best = null; int bestSpan = -1;
            foreach (var n in nodes)
            {
                if (n.Name == null || !IsContainerRole(n.Role)) continue;
                string ln = n.Name.ToLowerInvariant();
                bool hint = false; foreach (var h in ReportNameHints) if (ln.Contains(h)) { hint = true; break; }
                if (!hint) continue;
                int span = ChildSpan(nodes, n);
                if (span > bestSpan) { best = n; bestSpan = span; }
            }
            return best;
        }

        // Proxy for "how much content sits under this node" — count nodes whose path passes through its name.
        private static int ChildSpan(List<RNode> nodes, RNode n)
        {
            if (string.IsNullOrEmpty(n.Name)) return 0;
            string seg = ">" + n.Name;
            int c = 0;
            foreach (var x in nodes) if (x.Path != null && x.Path.IndexOf(seg, StringComparison.OrdinalIgnoreCase) >= 0) c++;
            return c;
        }

        // One JSON line. found:true -> nodes = the report subtree; found:false but realized -> candidates =
        // the top container-role names so the operator's live de-risk is actionable. blockedBy is set on the
        // fail-closed paths (ribbon-uia-unrealized / report-grid-not-found) and is NEVER a clearance signal.
        private static string ReportEnvelope(bool frameRealized, bool found, RNode container, List<RNode> nodes, List<RNode> allNodes, string blockedBy, string invokeState = null)
        {
            var sb = new StringBuilder();
            // op reflects the single-process invoke+read when invokeState is set; the Node normalizer keys on
            // frameRealized/found/nodes (not op), so existing read-report callers are byte-identical.
            sb.Append("{\"ok\":true,\"op\":\"").Append(invokeState != null ? "invoke-read" : "read-report").Append("\",\"frameRealized\":").Append(frameRealized ? "true" : "false")
              .Append(",\"found\":").Append(found ? "true" : "false");
            if (invokeState != null) sb.Append(",\"invokeState\":\"").Append(Esc(invokeState)).Append("\"");
            if (blockedBy != null) sb.Append(",\"blockedBy\":\"").Append(Esc(blockedBy)).Append("\"");
            if (container != null)
                sb.Append(",\"container\":{\"name\":\"").Append(Esc(Trunc(container.Name, 200))).Append("\",\"role\":\"").Append(Esc(container.Role)).Append("\"}");
            sb.Append(",\"nodes\":");
            if (found && nodes != null) AppendNodes(sb, nodes, 600); else sb.Append("null");
            if (!found && frameRealized && allNodes != null)
            {
                var cands = new List<RNode>();
                foreach (var n in allNodes) if (IsContainerRole(n.Role) && !string.IsNullOrEmpty(n.Name)) cands.Add(n);
                sb.Append(",\"candidates\":"); AppendNodes(sb, cands, 40);
            }
            sb.Append(",\"frameNodeCount\":").Append(allNodes != null ? allNodes.Count : 0).Append("}");
            return sb.ToString();
        }

        private static void AppendNodes(StringBuilder sb, List<RNode> nodes, int cap)
        {
            var seen = new HashSet<string>();
            sb.Append("[");
            int n = 0;
            foreach (var x in nodes)
            {
                string key = x.Name + "|" + x.Value + "|" + x.Role + "|" + x.Path;
                if (!seen.Add(key)) continue;
                if (n >= cap) break;
                if (n++ > 0) sb.Append(",");
                sb.Append("{\"text\":\"").Append(Esc(Trunc(x.Name, 300))).Append("\",\"value\":\"").Append(Esc(Trunc(x.Value, 300)))
                  .Append("\",\"role\":\"").Append(Esc(x.Role)).Append("\",\"path\":\"").Append(Esc(Trunc(x.Path, 300))).Append("\"}");
            }
            sb.Append("]");
        }
    }
}
