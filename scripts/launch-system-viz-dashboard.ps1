<#
.SYNOPSIS
  Idempotently launch the PRISM system-viz dashboard (:8765) + open browser.

.DESCRIPTION
  Used by LAUNCH-PRISM-FLEET.bat (Step 0, before golf + the 12 chat windows)
  and as a standalone "give me the fleet dashboard" entry point.

  Behavior:
    1. If TCP :8765 is already bound → skip server-start, just open browser.
    2. If not bound → spawn _server.cjs in its own Windows Terminal window
       titled "system-viz", wait up to 8 s for the port to come up, then open.
    3. If wt.exe is unavailable, falls back to a hidden Start-Process node call.
    4. Always opens http://127.0.0.1:8765/ in the default browser unless
       -NoOpenBrowser is passed.

  Loopback-only (127.0.0.1) — no public network exposure. Honors the
  no-public-H-drive constraint.

.PARAMETER NoOpenBrowser
  Start the server but skip opening the browser. Useful when the chats will
  reference the URL themselves rather than the operator wanting a tab.

.PARAMETER Port
  Override the dashboard port (default 8765 / $env:PRISM_VIZ_PORT).

.EXAMPLE
  pwsh -NoProfile -ExecutionPolicy Bypass -File H:\prism\scripts\launch-system-viz-dashboard.ps1
#>
[CmdletBinding()]
param(
    [switch]$NoOpenBrowser,
    [int]$Port = 0
)

$ErrorActionPreference = "Continue"

if ($Port -le 0) {
    $envPort = $env:PRISM_VIZ_PORT
    if ($envPort) { $Port = [int]$envPort } else { $Port = 8765 }
}

$ServerScript = "H:/prism/state/shared/system-viz/_server.cjs"
$NodeExe      = "H:/Tools/nodejs/node.exe"
if (-not (Test-Path $NodeExe)) { $NodeExe = "node" }
$Url          = "http://127.0.0.1:$Port/"

function Test-PortListening {
    param([int]$P)
    try {
        $hit = Get-NetTCPConnection -LocalPort $P -State Listen -ErrorAction Stop |
               Where-Object { $_.LocalAddress -in @("127.0.0.1","::1","0.0.0.0","::") } |
               Select-Object -First 1
        return [bool]$hit
    } catch { return $false }
}

function Wait-ForPort {
    param([int]$P, [int]$TimeoutSec = 8)
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    while ($sw.Elapsed.TotalSeconds -lt $TimeoutSec) {
        if (Test-PortListening -P $P) { return $true }
        Start-Sleep -Milliseconds 250
    }
    return $false
}

if (-not (Test-Path $ServerScript)) {
    Write-Error "system-viz server script missing: $ServerScript"
    exit 2
}

# Deploy the Hermes/Zebra Ops dashboard HTML into the (gitignored) system-viz
# dir so :8765 static fallback can serve it. Canonical source is tracked at
# scripts/static/hermes-zebra-ops.html. Always sync — source wins on mtime.
$OpsSrc = "H:/prism/scripts/static/hermes-zebra-ops.html"
$OpsDst = "H:/prism/state/shared/system-viz/hermes-zebra-ops.html"
if (Test-Path $OpsSrc) {
    try {
        $needCopy = $true
        if (Test-Path $OpsDst) {
            $s = (Get-Item $OpsSrc).LastWriteTimeUtc
            $d = (Get-Item $OpsDst).LastWriteTimeUtc
            if ($d -ge $s) { $needCopy = $false }
        }
        if ($needCopy) {
            Copy-Item -Path $OpsSrc -Destination $OpsDst -Force
            Write-Host "[system-viz] deployed hermes-zebra-ops.html" -ForegroundColor Cyan
        }
    } catch { Write-Warning "[system-viz] failed to deploy hermes-zebra-ops.html: $_" }
}

if (Test-PortListening -P $Port) {
    Write-Host "[system-viz] already serving on :$Port — skipping spawn" -ForegroundColor Cyan
} else {
    Write-Host "[system-viz] starting _server.cjs on :$Port ..." -ForegroundColor Yellow

    $wt = Get-Command wt.exe -ErrorAction SilentlyContinue
    if ($wt) {
        # Visible terminal window so operator can see logs / Ctrl+C to stop.
        $shell = if (Get-Command pwsh.exe -ErrorAction SilentlyContinue) { "pwsh" } else { "powershell" }
        Start-Process wt.exe -ArgumentList @(
            "-w","new","--title","system-viz","-d","H:\PRISM",
            $shell,"-NoExit","-Command","& '$NodeExe' '$ServerScript'"
        ) | Out-Null
    } else {
        # Headless fallback — server runs but no console window.
        Start-Process -FilePath $NodeExe -ArgumentList @($ServerScript) `
                     -WindowStyle Hidden -WorkingDirectory "H:\PRISM" | Out-Null
    }

    if (Wait-ForPort -P $Port -TimeoutSec 8) {
        Write-Host "[system-viz] bound 127.0.0.1:$Port" -ForegroundColor Green
    } else {
        Write-Warning "[system-viz] _server.cjs did not bind :$Port within 8s — check the spawned window for errors"
    }
}

if (-not $NoOpenBrowser) {
    Write-Host "[system-viz] opening $Url" -ForegroundColor Green
    Start-Process $Url | Out-Null
}

exit 0
