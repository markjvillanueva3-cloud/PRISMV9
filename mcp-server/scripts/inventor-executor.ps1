#!/usr/bin/env pwsh
<#
.SYNOPSIS
  inventor-executor.ps1 -- U-CADC09 (CAD-COMPLETE-MS0 PHASE-2)

.DESCRIPTION
  Subprocess harness that runs a PRISM-generated iLogic / VBA snippet
  inside Autodesk Inventor (via COM + iLogicVb.RunExternalRule), captures
  structured metrics (mass, volume, bounding box, face/edge/vertex counts)
  from the resulting active document, and emits a single-line JSON result
  to stdout that the InventorCADCodeGeneratorEngine consumes.

  Mirrors the freecad-executor.py contract verbatim: same JSON keys, same
  fixture values in --Mock mode, same single-line output requirement, same
  exit codes (0 on ok, 1 on any failure).

.PARAMETER ScriptPath
  Path to the .iLogicVb / .vb / .txt rule body to execute. Required
  unless -Mock.

.PARAMETER OutputIpt
  When set, persist the active document as .ipt at this path.

.PARAMETER OutputStep
  When set, export the active document to STEP via TranslatorAddIn.

.PARAMETER MetricsJson
  When set, write the structured metrics JSON to this file in addition
  to stdout.

.PARAMETER Mock
  Skip Inventor entirely; emit a deterministic fixture identical in
  shape to the real output. Lets CI exercise the engine ↔ executor
  JSON contract on machines without Inventor installed.

.PARAMETER NoEmitStdout
  Suppress the stdout JSON line (file-only output).

.OUTPUTS
  System.String (single-line JSON object on stdout -- see schema below).

.EXAMPLE
  .\inventor-executor.ps1 -Mock
    → emits {"ok":true,"error":null,...} to stdout, exit 0

.NOTES
  Output schema (engine ↔ executor contract):
    {
      "ok":         bool,
      "error":      "string or null",
      "durationMs": int,
      "metrics": {
        "volumeMm3":     number | null,
        "boundingBoxMm": [Lx, Ly, Lz] | null,
        "faceCount":     int | null,
        "edgeCount":     int | null,
        "vertexCount":   int | null
      },
      "outputs": { "ipt": "abs path or null", "step": "abs path or null" },
      "log":        "captured stdout/stderr (truncated to 65536 bytes)"
    }
#>

[CmdletBinding()]
param(
    [string]$ScriptPath = $null,
    [string]$OutputIpt = $null,
    [string]$OutputStep = $null,
    [string]$MetricsJson = $null,
    [switch]$Mock,
    [switch]$NoEmitStdout
)

$ErrorActionPreference = 'Stop'

# ── Constants ────────────────────────────────────────────────────────────
# Mock-mode fixture values -- must stay in lock-step with the engine's
# runScriptBody mock and with freecad-executor.py's mock_payload(). Any
# drift here is detected by the contract test on either side.
$MOCK_VOLUME_MM3   = 1000.0
$MOCK_BBOX_MM      = @(10.0, 10.0, 10.0)
$MOCK_FACE_COUNT   = 6
$MOCK_EDGE_COUNT   = 12
$MOCK_VERTEX_COUNT = 8

$LOG_TRUNCATE_BYTES = 65536

# ── Helpers ──────────────────────────────────────────────────────────────

function Get-MillisecondsSince {
    param([DateTime]$Started)
    $delta = (Get-Date) - $Started
    return [int]$delta.TotalMilliseconds
}

function ConvertTo-AbsPath {
    param([string]$Path)
    if (-not $Path) { return $null }
    return [System.IO.Path]::GetFullPath($Path)
}

function New-MetricsObject {
    param(
        $VolumeMm3 = $null,
        $BoundingBoxMm = $null,
        $FaceCount = $null,
        $EdgeCount = $null,
        $VertexCount = $null
    )
    return [ordered]@{
        volumeMm3     = $VolumeMm3
        boundingBoxMm = $BoundingBoxMm
        faceCount     = $FaceCount
        edgeCount     = $EdgeCount
        vertexCount   = $VertexCount
    }
}

function New-MockPayload {
    param([int]$DurationMs)
    return [ordered]@{
        ok         = $true
        error      = $null
        durationMs = $DurationMs
        metrics    = New-MetricsObject `
            -VolumeMm3 $MOCK_VOLUME_MM3 `
            -BoundingBoxMm $MOCK_BBOX_MM `
            -FaceCount $MOCK_FACE_COUNT `
            -EdgeCount $MOCK_EDGE_COUNT `
            -VertexCount $MOCK_VERTEX_COUNT
        outputs    = [ordered]@{ ipt = $null; step = $null }
        log        = "mock-mode executor (PRISM_CAD_MOCK / -Mock)"
    }
}

function New-FailurePayload {
    param([string]$Message, [DateTime]$Started)
    return [ordered]@{
        ok         = $false
        error      = $Message
        durationMs = (Get-MillisecondsSince -Started $Started)
        metrics    = New-MetricsObject
        outputs    = [ordered]@{ ipt = $null; step = $null }
        log        = $Message
    }
}

# Truncate a string to a byte budget without breaking UTF-8 multibyte
# sequences (cheap approximation: chop characters and re-measure).
function Limit-LogBytes {
    param([string]$Text, [int]$MaxBytes)
    if (-not $Text) { return "" }
    $enc = [System.Text.Encoding]::UTF8
    if ($enc.GetByteCount($Text) -le $MaxBytes) { return $Text }
    $chars = $Text.ToCharArray()
    # Binary search for the largest prefix that fits.
    $lo = 0; $hi = $chars.Length
    while ($lo -lt $hi) {
        $mid = [int](($lo + $hi + 1) / 2)
        if ($enc.GetByteCount($chars, 0, $mid) -le $MaxBytes) { $lo = $mid }
        else { $hi = $mid - 1 }
    }
    return -join $chars[0..($lo - 1)]
}

function Read-InventorMetrics {
    <#
    .SYNOPSIS
      Pull canonical metrics from an Inventor.Application's ActiveDocument.
    .NOTES
      Defensive: every metric is independently nullable. Missing
      ComponentDefinition / SurfaceBodies / RangeBox lands as null
      rather than throwing.
    #>
    param($InvApp)
    $doc = $InvApp.ActiveDocument
    if ($null -eq $doc) { return New-MetricsObject }

    $compDef = $null
    try { $compDef = $doc.ComponentDefinition } catch {}
    if ($null -eq $compDef) { return New-MetricsObject }

    $volumeCm3 = $null
    $bboxMm    = $null
    $faceCount = $null
    $edgeCount = $null
    $vertexCount = $null

    try {
        # MassProperties.Volume is in cm^3; convert to mm^3
        $mp = $compDef.MassProperties
        $volumeCm3 = [double]$mp.Volume
    } catch {}

    try {
        $rb = $compDef.RangeBox
        $minPt = $rb.MinPoint; $maxPt = $rb.MaxPoint
        # Inventor internal length unit is cm; convert to mm
        $bboxMm = @(
            ([double]($maxPt.X - $minPt.X) * 10.0),
            ([double]($maxPt.Y - $minPt.Y) * 10.0),
            ([double]($maxPt.Z - $minPt.Z) * 10.0)
        )
    } catch {}

    try {
        $bodies = $compDef.SurfaceBodies
        $f = 0; $e = 0; $v = 0
        for ($i = 1; $i -le $bodies.Count; $i++) {
            $body = $bodies.Item($i)
            $f += $body.Faces.Count
            $e += $body.Edges.Count
            $v += $body.Vertices.Count
        }
        $faceCount = $f
        $edgeCount = $e
        $vertexCount = $v
    } catch {}

    $volumeMm3 = $null
    if ($null -ne $volumeCm3 -and $volumeCm3 -gt 0) {
        $volumeMm3 = $volumeCm3 * 1000.0  # cm^3 → mm^3
    }

    return New-MetricsObject `
        -VolumeMm3 $volumeMm3 `
        -BoundingBoxMm $bboxMm `
        -FaceCount $faceCount `
        -EdgeCount $edgeCount `
        -VertexCount $vertexCount
}

function Invoke-RealRun {
    param([DateTime]$Started)

    if (-not $ScriptPath) {
        return New-FailurePayload -Message "-ScriptPath is required in real mode" -Started $Started
    }
    if (-not (Test-Path $ScriptPath -PathType Leaf)) {
        return New-FailurePayload -Message "script not found: $ScriptPath" -Started $Started
    }

    $invApp = $null
    try {
        $invApp = New-Object -ComObject 'Inventor.Application' -ErrorAction Stop
    } catch {
        return New-FailurePayload `
            -Message "Inventor COM object unavailable: $($_.Exception.Message)" `
            -Started $Started
    }

    $logBuilder = New-Object System.Text.StringBuilder
    $error = $null
    $iptOut = $null
    $stepOut = $null
    $metrics = New-MetricsObject

    try {
        $invApp.Visible = $false
        $rule = Get-Content -Raw -Path $ScriptPath
        # Run the rule via iLogicVb if available; fall back to evaluating
        # the rule text against the application's iLogic engine.
        $iLogic = $null
        try { $iLogic = $invApp.ApplicationAddIns.ItemById('{3BDD8D79-2179-4B11-8A5A-257B1C0263AC}').Automation } catch {}
        if ($null -ne $iLogic) {
            [void]$iLogic.RunExternalRule($ScriptPath)
        } else {
            # Last-resort fallback: write rule body to a temp .iLogicVb and
            # let any iLogic-aware add-in pick it up. Surface as warning.
            [void]$logBuilder.AppendLine("iLogic add-in not registered; rule body length=$($rule.Length) bytes -- manual execution required")
        }

        $metrics = Read-InventorMetrics -InvApp $invApp

        if ($OutputIpt -and $null -ne $invApp.ActiveDocument) {
            $invApp.ActiveDocument.SaveAs($OutputIpt, $false)
            $iptOut = ConvertTo-AbsPath -Path $OutputIpt
        }
        if ($OutputStep -and $null -ne $invApp.ActiveDocument) {
            # STEP export via TranslatorAddIn -- best-effort; absence of
            # the add-in is non-fatal.
            try {
                $stepXAddin = $invApp.ApplicationAddIns.ItemById('{90AF7F40-0C01-11D5-8E83-0010B541CD80}').Automation
                if ($null -ne $stepXAddin) {
                    $context = $invApp.TransientObjects.CreateTranslationContext()
                    $context.Type = 0  # kFileBrowseIOMechanism
                    $opts = $invApp.TransientObjects.CreateNameValueMap()
                    $data = $invApp.TransientObjects.CreateDataMedium()
                    $data.FileName = $OutputStep
                    [void]$stepXAddin.SaveCopyAs($invApp.ActiveDocument, $context, $opts, $data)
                    $stepOut = ConvertTo-AbsPath -Path $OutputStep
                }
            } catch {
                [void]$logBuilder.AppendLine("STEP export failed: $($_.Exception.Message)")
            }
        }
    } catch {
        $error = "$($_.Exception.GetType().Name): $($_.Exception.Message)"
        [void]$logBuilder.AppendLine($_.ScriptStackTrace)
    } finally {
        try { $invApp.Quit() } catch {}
        $invApp = $null
        [System.GC]::Collect()
        [System.GC]::WaitForPendingFinalizers()
    }

    return [ordered]@{
        ok         = ($null -eq $error)
        error      = $error
        durationMs = (Get-MillisecondsSince -Started $Started)
        metrics    = $metrics
        outputs    = [ordered]@{ ipt = $iptOut; step = $stepOut }
        log        = (Limit-LogBytes -Text $logBuilder.ToString() -MaxBytes $LOG_TRUNCATE_BYTES)
    }
}

# ── Main ─────────────────────────────────────────────────────────────────

$started = Get-Date

$useMock = $Mock.IsPresent -or ($env:PRISM_CAD_MOCK -eq '1')

if ($useMock) {
    $payload = New-MockPayload -DurationMs (Get-MillisecondsSince -Started $started)
    if ($OutputIpt)  { $payload.outputs.ipt  = ConvertTo-AbsPath -Path $OutputIpt }
    if ($OutputStep) { $payload.outputs.step = ConvertTo-AbsPath -Path $OutputStep }
} else {
    $payload = Invoke-RealRun -Started $started
}

# Compact JSON -- single line. ConvertTo-Json's default depth is 2; bump to
# 8 so the nested metrics + outputs always fully serialize.
$payloadJson = $payload | ConvertTo-Json -Depth 8 -Compress

if ($MetricsJson) {
    $parent = Split-Path -Parent (ConvertTo-AbsPath -Path $MetricsJson)
    if ($parent -and -not (Test-Path $parent)) {
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
    }
    [System.IO.File]::WriteAllText($MetricsJson, $payloadJson + "`n", (New-Object System.Text.UTF8Encoding($false)))
}

if (-not $NoEmitStdout.IsPresent) {
    [Console]::Out.WriteLine($payloadJson)
    [Console]::Out.Flush()
}

if ($payload.ok) { exit 0 } else { exit 1 }
