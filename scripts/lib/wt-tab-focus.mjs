#!/usr/bin/env node
/**
 * wt-tab-focus.mjs - U-ZM2-01 - UIA-based Windows Terminal tab focus for the
 * zebra orchestrator.
 *
 * Why: the PRISM fleet runs as TABS of a single Windows Terminal window
 * (empirically: 1 WT process, 5 TabItems, 17 OpenConsoles = WT split panes).
 * EnumWindows + GetWindowText cannot target a tab (sees one WT HWND; only
 * the focused tab's caption surfaces). UI Automation DOES expose each tab as
 * a `TabItem` under the WT window root, and `SelectionItemPattern.Select()`
 * focuses it. This is the foundation of ZEBRA-ORCHESTRATOR-MS2.
 *
 * Safety (LOAD-BEARING): a wrong tab/pane = SendKeys lands in the wrong chat
 * = silent context loss. The actuator REFUSES to return `ok` when:
 *   - no Windows Terminal window is found (`no-wt-process`);
 *   - no TabItem matches the slot (`no-tab`);
 *   - more than one TabItem matches (`ambiguous-tab`);
 *   - the SelectionItemPattern is unavailable (`no-select-pattern`);
 *   - the post-select pane count is NOT exactly 1 (`pane-count:<n>` -
 *     a multi-pane tab requires U-ZM2-02 pane-focus; a zero count means
 *     the UIA tree hasn't realized the tab content yet).
 * On every refusal the WT window is left foregrounded (the select already
 * happened) BUT the JS caller does NOT actuate - the only path that returns
 * `ok:true` carries a verified single-pane, uniquely-matched tab.
 *
 * Tab-name match is case-insensitive AND multi-tier - matches any of:
 *   - bare slot:           `alpha` / `ALPHA`   (composeSlotTitle bare form)
 *   - `PRISM <slot>`:      `PRISM alpha` (any case)  (slot-tab-boot.ps1 +
 *                          rename-window-intercept composeSlotTitle convention)
 *   - `<slot> | <tag>` first token before `|`:  `alpha | token-opt`
 *                          (regenerate-launch-fleet.mjs tabTitleFor convention)
 *   - single first-letter: `a`  (the slot's first letter - this is what the
 *                          LIVE fleet actually shows: operators pin short
 *                          1-char WT tab titles so all 26 NATO tabs fit the tab
 *                          bar, and a manual WT rename OVERRIDES the app-set
 *                          `PRISM <slot>` title). NATO gives every slot a UNIQUE
 *                          first letter (alpha->a ... zulu->z), so this is
 *                          anchored + unambiguous. Without this tier the running
 *                          fleet's tabs are unresolvable, so self-compact /
 *                          self-startup / zebra-sweep never fire.
 * The match logic is mirrored in the pure exported `tabNameMatchesSlot` below
 * (kept in sync with the PS `FOCUS_PS` match) so it is hermetically testable.
 * Uniqueness across ALL WT windows is required (the `ambiguous-tab` refusal),
 * which backstops the looser single-letter tier if two tabs ever collide.
 *
 * Pure-core + injected `_spawn` so tests are hermetic. Never throws.
 * No file I/O. The caller (zebra-orchestrator-sweep.mjs) is the only
 * fleet-internal consumer; an operator can probe via the CLI tail.
 *
 * Knobs:
 *   PRISM_WT_FOCUS_TIMEOUT_MS=N   PS timeout (default 8000)
 *   PRISM_WT_FOCUS_SETTLE_MS=N    post-Select settle before pane count (default 100)
 *   PRISM_WT_FOCUS_DISABLE=1      forces every call to return `{ok:false, error:"disabled"}`
 */
// tier: T2

import { spawnSync as nodeSpawnSync } from "node:child_process";

const PS_TIMEOUT_DEFAULT_MS = 8000;
const PS_MAX_BUFFER = 4 * 1024 * 1024;
const SETTLE_DEFAULT_MS = 100;

// Inline PowerShell. Reads the slot from $env:PRISM_WT_SLOT and the settle
// interval from $env:PRISM_WT_SETTLE_MS to avoid string-quoting in -Command.
// Emits exactly one line on stdout: `OK <hwnd> <tabName> <paneCount>` or
// `FAIL <reason>`. Exits 0 on OK, non-zero on FAIL.
const FOCUS_PS =
  "$ErrorActionPreference='Stop'\n" +
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n" +
  "Add-Type -AssemblyName UIAutomationClient\n" +
  "Add-Type @'\n" +
  "using System;\n" +
  "using System.Runtime.InteropServices;\n" +
  "public static class WTU {\n" +
  "  [DllImport(\"user32.dll\")] public static extern bool ShowWindowAsync(IntPtr h, int n);\n" +
  "  [DllImport(\"user32.dll\")] public static extern bool SetForegroundWindow(IntPtr h);\n" +
  "}\n" +
  "'@\n" +
  "$slot = $env:PRISM_WT_SLOT\n" +
  "if (-not $slot) { Write-Output 'FAIL no-slot'; exit 1 }\n" +
  "$slotLow = $slot.ToLower()\n" +
  "$prismName = 'PRISM ' + $slotLow\n" +
  "$slotInit = $slotLow.Substring(0,1)\n" +
  "$dryRun = ($env:PRISM_WT_DRY_RUN -eq '1')\n" +
  "$wtProcs = Get-Process WindowsTerminal -ErrorAction SilentlyContinue\n" +
  "if (-not $wtProcs) { Write-Output 'FAIL no-wt-process'; exit 2 }\n" +
  "# A WT process may own MULTIPLE top-level windows (a user can split the\n" +
  "# fleet across several WT windows). MainWindowHandle returns only one.\n" +
  "# Walk the UIA desktop's children filtered by WT ProcessId so EVERY WT\n" +
  "# window is probed. Wrap UIA on each window in try/catch -- invisible\n" +
  "# PopupHost windows throw E_UNEXPECTED on FindAll.\n" +
  "$wtPids = @($wtProcs | ForEach-Object { [uint32]$_.Id })\n" +
  "$desktop = [System.Windows.Automation.AutomationElement]::RootElement\n" +
  "$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker\n" +
  "$matches = @()\n" +
  "$node = $walker.GetFirstChild($desktop)\n" +
  "while ($node -ne $null) {\n" +
  "  $procId = 0\n" +
  "  try { $procId = $node.Current.ProcessId } catch { }\n" +
  "  if ($wtPids -contains $procId) {\n" +
  "    $offscreen = $true\n" +
  "    try { $offscreen = $node.Current.IsOffscreen } catch { }\n" +
  "    if (-not $offscreen) {\n" +
  "      try {\n" +
  "        $h = 0\n" +
  "        try { $h = [long]$node.Current.NativeWindowHandle } catch { }\n" +
  "        if ($h -ne 0) {\n" +
  "          $tabCt = [System.Windows.Automation.ControlType]::TabItem\n" +
  "          $cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, $tabCt)\n" +
  "          $tabs = $node.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)\n" +
  "          foreach ($t in $tabs) {\n" +
  "            $nm = $null\n" +
  "            try { $nm = $t.Current.Name } catch { }\n" +
  "            if ($nm) {\n" +
  // MATCH (mirror of `tabNameMatchesSlot` below - KEEP IN SYNC): a tab matches
  // the slot if its lowercased name equals the bare slot, equals `PRISM <slot>`
  // (PS -eq is case-insensitive), its first token before `|` equals the slot
  // (the `<slot> | <tag>` launcher convention), OR it equals the slot's single
  // first letter (the operator-pinned compact tab title the live fleet shows).
  // All four are ANCHORED exact equality - never a substring contains - so
  // `betalpha`/`xalpha`/`ab` never match. NATO first letters are unique, and
  // the `ambiguous-tab` refusal backstops any collision.
  "              $nl = $nm.ToLower()\n" +
  "              $firstTok = ($nl -split '\\|')[0].Trim()\n" +
  "              if ($nl -eq $slotLow -or $nl -eq $prismName -or $firstTok -eq $slotLow -or $nl -eq $slotInit) {\n" +
  "                $matches += [PSCustomObject]@{ Tab = $t; Hwnd = $h; Name = $nm; Root = $node }\n" +
  "              }\n" +
  "            }\n" +
  "          }\n" +
  "        }\n" +
  "      } catch { }\n" +
  "    }\n" +
  "  }\n" +
  "  $node = $walker.GetNextSibling($node)\n" +
  "}\n" +
  "if ($matches.Count -eq 0) { Write-Output 'FAIL no-tab'; exit 3 }\n" +
  "if ($matches.Count -gt 1) { Write-Output ('FAIL ambiguous-tab ' + $matches.Count); exit 4 }\n" +
  "$m = $matches[0]\n" +
  "try { $selPat = $m.Tab.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern) }\n" +
  "catch { Write-Output 'FAIL no-select-pattern'; exit 5 }\n" +
  "if (-not $selPat) { Write-Output 'FAIL no-select-pattern'; exit 5 }\n" +
  "# Dry-run: PROBE only - verify the tab + pane-count without switching focus\n" +
  "# or foregrounding (the 24h opt-in grace forces dry-run so no user disruption).\n" +
  "# Pane-count is checked against the currently focused tab; if the target\n" +
  "# tab is not the focused one, dry-run returns 'dry-run-unfocused' so the\n" +
  "# sweep still reports a resolvable tab but does not claim single-pane proof.\n" +
  "if ($dryRun) {\n" +
  "  $ccCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'TermControl')\n" +
  "  $tcs = $m.Root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $ccCond)\n" +
  "  $sel = $false\n" +
  "  try { $sel = $selPat.Current.IsSelected } catch { $sel = $false }\n" +
  "  if ($sel) {\n" +
  "    if ($tcs.Count -ne 1) { Write-Output ('FAIL pane-count ' + $tcs.Count); exit 6 }\n" +
  "    Write-Output ('OK ' + $m.Hwnd + ' ' + $m.Name + ' 1')\n" +
  "  } else {\n" +
  "    Write-Output ('OK ' + $m.Hwnd + ' ' + $m.Name + ' dry-run-unfocused')\n" +
  "  }\n" +
  "  exit 0\n" +
  "}\n" +
  "# Execute path: Select + verify single-pane + restore + foreground.\n" +
  "$selPat.Select()\n" +
  "$settle = 100\n" +
  "if ($env:PRISM_WT_SETTLE_MS) { $settle = [int]$env:PRISM_WT_SETTLE_MS }\n" +
  "Start-Sleep -Milliseconds $settle\n" +
  "$ccCond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ClassNameProperty, 'TermControl')\n" +
  "$tcs = $m.Root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $ccCond)\n" +
  "if ($tcs.Count -ne 1) { Write-Output ('FAIL pane-count ' + $tcs.Count); exit 6 }\n" +
  "[WTU]::ShowWindowAsync([IntPtr]$m.Hwnd, 9) | Out-Null\n" +
  "[WTU]::SetForegroundWindow([IntPtr]$m.Hwnd) | Out-Null\n" +
  "Write-Output ('OK ' + $m.Hwnd + ' ' + $m.Name + ' 1')\n" +
  "exit 0\n";

/**
 * Pure: parse the PS output envelope. Exported for hermetic tests.
 * Last non-empty line of stdout is the verdict. `OK <hwnd> <tabName...> <paneCount>`
 * (tabName may contain spaces, e.g. "PRISM kilo"); first and last whitespace
 * tokens are hwnd / paneCount. `FAIL <reason>` is anything else.
 */
export function parseFocusOutput(stdout, stderr, exitCode) {
  const lines = String(stdout ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const line = lines[lines.length - 1] || "";
  if (exitCode !== 0) {
    const reason = line.replace(/^FAIL\s*/i, "") || String(stderr ?? "").trim().slice(0, 200) || `ps-exit-${exitCode}`;
    return { ok: false, error: reason };
  }
  if (!line.startsWith("OK ")) {
    return { ok: false, error: line || "unrecognized-output" };
  }
  const parts = line.split(/\s+/);
  if (parts.length < 4) return { ok: false, error: "ok-malformed" };
  const hwnd = Number(parts[1]);
  const paneCount = Number(parts[parts.length - 1]);
  const tabName = parts.slice(2, parts.length - 1).join(" ");
  if (!Number.isFinite(hwnd) || hwnd <= 0) return { ok: false, error: "ok-bad-hwnd" };
  // U-ZM2-01 dry-run extension: the last token may be the literal
  // 'dry-run-unfocused' instead of an integer when the resolver verified the
  // tab exists but cannot prove single-pane (because the target tab is not
  // the currently-focused one and we did not Select() in dry-run mode).
  const lastToken = parts[parts.length - 1];
  if (lastToken === "dry-run-unfocused") {
    if (!tabName) return { ok: false, error: "ok-empty-tabname" };
    return { ok: true, hwnd, tabName, paneCount: null, dryRunUnfocused: true };
  }
  if (!Number.isFinite(paneCount) || paneCount !== 1) return { ok: false, error: `ok-bad-pane-count:${paneCount}` };
  if (!tabName) return { ok: false, error: "ok-empty-tabname" };
  return { ok: true, hwnd, tabName, paneCount };
}

/**
 * Pure: does a WT TabItem UIA Name match this slot? Exported MIRROR of the
 * `FOCUS_PS` match (lines ~100-102) so the match semantics are hermetically
 * unit-testable (the live match runs in PowerShell over real UIA tabs and is
 * not directly testable). KEEP IN SYNC with the PS condition.
 *
 * Accepts (case-insensitive): the bare slot (`alpha`), `PRISM <slot>`
 * (`PRISM alpha`), the first token before `|` of the launcher's
 * `<slot> | <tag>` convention (`alpha | token-opt`), OR the slot's single
 * first letter (`a` - the operator-pinned compact tab title the live fleet
 * shows; NATO first letters are unique so `a`<->alpha is unambiguous). All
 * four are ANCHORED exact equality - NOT a substring `contains` - so a longer
 * name that merely embeds the slot (`betalpha`, `xalpha`, `alpha-2`, `ab`)
 * NEVER matches. This is the load-bearing safety property: a wrong (but unique)
 * match would SendKeys into the wrong chat. Uniqueness is enforced separately
 * by the `ambiguous-tab` refusal in the PS layer (backstops the single-letter
 * tier if two tabs ever collide).
 *
 * Mirrors the PS exactly: the name is lowercased but NOT trimmed (only the
 * first-token is `.Trim()`-ed), matching `$nl = $nm.ToLower()` +
 * `$firstTok = ($nl -split '\\|')[0].Trim()` + `$slotInit = $slotLow.Substring(0,1)`.
 *
 * @param {string} name  the TabItem UIA Name (raw, any case)
 * @param {string} slot  the NATO slot (any case; trimmed+lowercased here)
 * @returns {boolean}
 */
export function tabNameMatchesSlot(name, slot) {
  if (typeof name !== "string" || typeof slot !== "string") return false;
  const slotLow = slot.trim().toLowerCase();
  if (!slotLow) return false;
  const nl = name.toLowerCase();              // mirrors $nm.ToLower() (NO trim)
  if (!nl) return false;                      // PS `if ($nm)` guards empty names
  const prismName = "prism " + slotLow;       // PS 'PRISM '+slot, -eq is case-insensitive
  const firstTok = nl.split("|")[0].trim();   // mirrors ($nl -split '\|')[0].Trim()
  const slotInit = slotLow[0];                // mirrors $slotLow.Substring(0,1)
  return nl === slotLow || nl === prismName || firstTok === slotLow || nl === slotInit;
}

/**
 * Pure: validate the slot argument. Lowercase NATO-ish letter run. Exported
 * for tests. The PS side also re-checks (defense in depth) but JS rejects
 * early.
 */
export function validateSlot(slot) {
  if (slot === null || slot === undefined) return { ok: false, error: "slot-missing" };
  if (typeof slot !== "string") return { ok: false, error: "slot-not-string" };
  const s = slot.trim().toLowerCase();
  if (!s) return { ok: false, error: "slot-empty" };
  if (!/^[a-z]+$/.test(s)) return { ok: false, error: "slot-bad-chars" };
  return { ok: true, slot: s };
}

/**
 * Focus the WT tab whose UIA Name matches `slot` (case-insensitive: bare slot,
 * `PRISM <slot>` prefix, the `<slot> | <tag>` launcher first token, or the
 * slot's single first letter - see `tabNameMatchesSlot`) AND verify that tab
 * has exactly one TermControl pane. Restores + foregrounds the WT window on
 * success.
 *
 * Returns:
 *   { ok: true, hwnd, tabName, paneCount: 1 }
 *   { ok: false, error: "<precise-reason>" }
 *
 * Never throws. Pure-core + injected `_spawn` for tests.
 */
export function focusWtTabBySlot(slot, opts = {}) {
  if (process.env.PRISM_WT_FOCUS_DISABLE === "1") {
    return { ok: false, error: "disabled" };
  }
  const _spawn = opts._spawn || nodeSpawnSync;
  const _platform = opts._platform || process.platform;
  if (_platform !== "win32") {
    return { ok: false, error: "platform-not-windows" };
  }
  const v = validateSlot(slot);
  if (!v.ok) return { ok: false, error: v.error };

  const timeoutMs = Number(process.env.PRISM_WT_FOCUS_TIMEOUT_MS) || opts.timeoutMs || PS_TIMEOUT_DEFAULT_MS;
  const settleMs = Number(process.env.PRISM_WT_FOCUS_SETTLE_MS) || opts.settleMs || SETTLE_DEFAULT_MS;

  let res;
  try {
    res = _spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", FOCUS_PS],
      {
        encoding: "utf8",
        timeout: timeoutMs,
        windowsHide: true,
        maxBuffer: PS_MAX_BUFFER,
        env: {
          ...process.env,
          PRISM_WT_SLOT: v.slot,
          PRISM_WT_SETTLE_MS: String(settleMs),
          PRISM_WT_DRY_RUN: opts.dryRun ? "1" : "0",
        },
      },
    );
  } catch (e) {
    return { ok: false, error: `spawn-threw:${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res) return { ok: false, error: "spawn-null" };
  if (res.signal) return { ok: false, error: `spawn-signal:${res.signal}` };
  if (res.error) {
    return { ok: false, error: `spawn-error:${String(res.error?.message || res.error).slice(0, 120)}` };
  }
  return parseFocusOutput(res.stdout, res.stderr, res.status);
}

// ---------------------------------------------------------------------------
// SELF-COMPACT-MS0 / U-SELFCOMPACT-SINGLETAB (2026-06-24, slot:charlie)
//
// countWtWindowTabs(pid): given a STABLE owning-window pid (chat-slots
// tw-ps/tw-pa), count the WT TabItems in the window(s) owned by that pid.
//
// WHY: self-compact's owning-pid tier resolves the WHOLE WT window, not a
// specific tab. SendKeys to the window hwnd lands in whatever tab is CURRENTLY
// FOCUSED -- which is this chat's tab ONLY IF the window hosts exactly ONE tab.
// So when UIA tab-name match returns `no-tab`/`ambiguous-tab` (the operator did
// not name the tab after the slot), the owning-pid is safe to use IFF its
// window is single-tab. This probe is the gate: tabCount===1 -> safe fallthrough;
// tabCount>1 -> the existing refusal stands (never guess which sibling tab).
//
// The pid is the SAME stable owning-window pid resolve-hwnd.mjs resolves an hwnd
// from; here we walk the UIA tree filtered by that pid and count TabItems. We do
// NOT Select/foreground anything -- pure read probe. Mirrors the FOCUS_PS UIA
// walk (KEEP IN SYNC) but counts tabs for ONE pid instead of name-matching.
// ---------------------------------------------------------------------------
const COUNT_TABS_PS =
  "$ErrorActionPreference='Stop'\n" +
  "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8\n" +
  "Add-Type -AssemblyName UIAutomationClient\n" +
  "$wantPid = [uint32]$env:PRISM_WT_PID\n" +
  "if (-not $wantPid) { Write-Output 'FAIL no-pid'; exit 1 }\n" +
  "$proc = Get-Process -Id $wantPid -ErrorAction SilentlyContinue\n" +
  "if (-not $proc) { Write-Output 'FAIL pid-not-found'; exit 2 }\n" +
  // The chat-slots owning pid is the PowerShell/ancestor host -- its OWN process
  // name is not 'WindowsTerminal'. The WT window is owned by a WindowsTerminal
  // process; the host pid is an ANCESTOR/child relationship, not the WT pid.
  // So we cannot filter UIA by $wantPid directly. Instead: resolve the host
  // pid's MainWindowHandle (the console window it owns) -- under Windows
  // Terminal that IS the WT window hwnd. Then count TabItems under THAT window.
  "$hwnd = [long]$proc.MainWindowHandle\n" +
  "if ($hwnd -eq 0) { Write-Output 'FAIL no-window'; exit 3 }\n" +
  "$root = [System.Windows.Automation.AutomationElement]::FromHandle([IntPtr]$hwnd)\n" +
  "if (-not $root) { Write-Output 'FAIL no-uia-root'; exit 4 }\n" +
  "$tabCt = [System.Windows.Automation.ControlType]::TabItem\n" +
  "$cond = New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty, $tabCt)\n" +
  "$tabs = $root.FindAll([System.Windows.Automation.TreeScope]::Descendants, $cond)\n" +
  "Write-Output ('OK ' + $hwnd + ' ' + $tabs.Count)\n" +
  "exit 0\n";

/**
 * Pure: parse the COUNT_TABS_PS envelope. `OK <hwnd> <tabCount>` or
 * `FAIL <reason>`. Exported for hermetic tests.
 */
export function parseCountTabsOutput(stdout, stderr, exitCode) {
  const lines = String(stdout ?? "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const line = lines[lines.length - 1] || "";
  if (exitCode !== 0) {
    const reason = line.replace(/^FAIL\s*/i, "") || String(stderr ?? "").trim().slice(0, 200) || `ps-exit-${exitCode}`;
    return { ok: false, error: reason };
  }
  if (!line.startsWith("OK ")) return { ok: false, error: line || "unrecognized-output" };
  const parts = line.split(/\s+/);
  if (parts.length < 3) return { ok: false, error: "ok-malformed" };
  const hwnd = Number(parts[1]);
  const tabCount = Number(parts[2]);
  if (!Number.isFinite(hwnd) || hwnd <= 0) return { ok: false, error: "ok-bad-hwnd" };
  if (!Number.isInteger(tabCount) || tabCount < 0) return { ok: false, error: `ok-bad-tabcount:${parts[2]}` };
  return { ok: true, hwnd, tabCount };
}

/**
 * Count the WT TabItems in the window owned by a STABLE owning-window `pid`.
 * Returns { ok:true, hwnd, tabCount } or { ok:false, error }. Never throws.
 * Pure-core + injected `_spawn` for tests. A `tabCount===1` result is the
 * single-tab-window proof self-compact needs before trusting the window hwnd.
 *
 * @param {number} pid  stable owning-window pid (tw-ps/tw-pa)
 * @param {{_spawn?:Function,_platform?:string,timeoutMs?:number}} [opts]
 */
export function countWtWindowTabs(pid, opts = {}) {
  if (process.env.PRISM_WT_FOCUS_DISABLE === "1") return { ok: false, error: "disabled" };
  const _spawn = opts._spawn || nodeSpawnSync;
  const _platform = opts._platform || process.platform;
  if (_platform !== "win32") return { ok: false, error: "platform-not-windows" };
  const v = validatePid(pid);
  if (!v.ok) return { ok: false, error: v.error };
  const timeoutMs = Number(process.env.PRISM_WT_FOCUS_TIMEOUT_MS) || opts.timeoutMs || PS_TIMEOUT_DEFAULT_MS;
  let res;
  try {
    res = _spawn(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", COUNT_TABS_PS],
      { encoding: "utf8", timeout: timeoutMs, windowsHide: true, maxBuffer: PS_MAX_BUFFER,
        env: { ...process.env, PRISM_WT_PID: String(v.pid) } },
    );
  } catch (e) {
    return { ok: false, error: `spawn-threw:${String(e?.message || e).slice(0, 120)}` };
  }
  if (!res) return { ok: false, error: "spawn-null" };
  if (res.signal) return { ok: false, error: `spawn-signal:${res.signal}` };
  if (res.error) return { ok: false, error: `spawn-error:${String(res.error?.message || res.error).slice(0, 120)}` };
  return parseCountTabsOutput(res.stdout, res.stderr, res.status);
}

// validatePid is needed by countWtWindowTabs; import it lazily from resolve-hwnd
// would create a cycle risk, so we re-declare the same minimal validation here
// (mirrors resolve-hwnd.mjs validatePid -- KEEP IN SYNC; pid must be a positive
// integer). A divergence would only make this probe stricter, never unsafe.
function validatePid(pid) {
  const n = typeof pid === "string" ? Number(pid) : pid;
  if (typeof n !== "number" || !Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    return { ok: false, error: "pid-invalid" };
  }
  return { ok: true, pid: n };
}

// CLI: node wt-tab-focus.mjs <slot> - prints JSON envelope, exit 0/1.
//      node wt-tab-focus.mjs --count-tabs <pid> - prints tab-count envelope.
if (process.argv[1]?.endsWith("wt-tab-focus.mjs")) {
  if (process.argv[2] === "--count-tabs") {
    const r = countWtWindowTabs(Number(process.argv[3]));
    process.stdout.write(JSON.stringify(r) + "\n");
    process.exit(r.ok ? 0 : 1);
  }
  const slot = process.argv[2];
  const r = focusWtTabBySlot(slot);
  process.stdout.write(JSON.stringify(r) + "\n");
  process.exit(r.ok ? 0 : 1);
}
