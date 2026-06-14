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
 *   - bare slot lowercase: `kilo`
 *   - bare slot uppercase: `KILO`   (current launcher convention)
 *   - `PRISM <slot>` lowercase     (composeSlotTitle convention)
 * Uniqueness across ALL WT windows is required.
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
  "$dryRun = ($env:PRISM_WT_DRY_RUN -eq '1')\n" +
  "$wtProcs = Get-Process WindowsTerminal -ErrorAction SilentlyContinue\n" +
  "if (-not $wtProcs) { Write-Output 'FAIL no-wt-process'; exit 2 }\n" +
  "# A WT process may own MULTIPLE top-level windows (a user can split the\n" +
  "# fleet across several WT windows). MainWindowHandle returns only one.\n" +
  "# Walk the UIA desktop's children filtered by WT ProcessId so EVERY WT\n" +
  "# window is probed. Wrap UIA on each window in try/catch — invisible\n" +
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
  "              $nl = $nm.ToLower()\n" +
  "              if ($nl -eq $slotLow -or $nl -eq $prismName) {\n" +
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
 * Focus the WT tab whose UIA Name matches `slot` (case-insensitive, bare or
 * `PRISM <slot>` prefix) AND verify that tab has exactly one TermControl
 * pane. Restores + foregrounds the WT window on success.
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

// CLI: node wt-tab-focus.mjs <slot> - prints JSON envelope, exit 0/1.
if (process.argv[1]?.endsWith("wt-tab-focus.mjs")) {
  const slot = process.argv[2];
  const r = focusWtTabBySlot(slot);
  process.stdout.write(JSON.stringify(r) + "\n");
  process.exit(r.ok ? 0 : 1);
}
