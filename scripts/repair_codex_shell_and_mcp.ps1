$ErrorActionPreference = 'Stop'

$homeDir = 'C:\Users\Mark Villanueva'
$tempDir = Join-Path $homeDir 'AppData\Local\Temp'
$nodePath = 'C:\Program Files\nodejs'
$psWin = 'C:\Windows\System32\WindowsPowerShell\v1.0'
$psCore = 'C:\Program Files\PowerShell\7'
$windowsApps = Join-Path $homeDir 'AppData\Local\Microsoft\WindowsApps'
$repoRoot = 'H:\PRISM'
$serverRoot = Join-Path $repoRoot 'mcp-server'
$logDir = Join-Path $repoRoot 'state\shared'
$logPath = Join-Path $logDir 'codex-shell-mcp-repair.log'

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$canonicalPath = @(
  'C:\Windows\System32'
  'C:\Windows'
  $psWin
  $psCore
  $nodePath
  $windowsApps
) -join ';'

[Environment]::SetEnvironmentVariable('COMSPEC', 'C:\Windows\System32\cmd.exe', 'User')
[Environment]::SetEnvironmentVariable('SystemRoot', 'C:\Windows', 'User')
[Environment]::SetEnvironmentVariable('windir', 'C:\Windows', 'User')
[Environment]::SetEnvironmentVariable('TEMP', $tempDir, 'User')
[Environment]::SetEnvironmentVariable('TMP', $tempDir, 'User')
[Environment]::SetEnvironmentVariable('PATH', $canonicalPath, 'User')

$env:COMSPEC = 'C:\Windows\System32\cmd.exe'
$env:SystemRoot = 'C:\Windows'
$env:windir = 'C:\Windows'
$env:TEMP = $tempDir
$env:TMP = $tempDir
$env:PATH = $canonicalPath

$nodeExe = Join-Path $nodePath 'node.exe'
if (-not (Test-Path $nodeExe)) {
  throw "Node was not found at $nodeExe"
}

$repairNote = @"
[$(Get-Date -Format o)] Codex shell + MCP repair starting.
PATH=$canonicalPath
TEMP=$tempDir
"@
$repairNote | Out-File -FilePath $logPath -Encoding utf8 -Append

Get-CimInstance Win32_Process |
  Where-Object {
    $_.Name -eq 'node.exe' -and
    $_.CommandLine -match 'H:\\PRISM\\mcp-server' -and
    $_.CommandLine -notmatch 'agent-coordination-daemon'
  } |
  ForEach-Object {
    try {
      Stop-Process -Id $_.ProcessId -Force -ErrorAction Stop
      "[$(Get-Date -Format o)] stopped stale process $($_.ProcessId)" | Out-File -FilePath $logPath -Encoding utf8 -Append
    } catch {
      "[$(Get-Date -Format o)] failed stopping process $($_.ProcessId): $($_.Exception.Message)" | Out-File -FilePath $logPath -Encoding utf8 -Append
    }
  }

$startHttp = Join-Path $serverRoot 'scripts\start-http.mjs'
if (-not (Test-Path $startHttp)) {
  throw "Missing PRISM HTTP launcher at $startHttp"
}

Start-Process -FilePath $nodeExe -ArgumentList @($startHttp) -WorkingDirectory $serverRoot -WindowStyle Hidden | Out-Null
Start-Sleep -Seconds 5

try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:3000/health' -TimeoutSec 10
  "[$(Get-Date -Format o)] backend health ok: $($health | ConvertTo-Json -Compress)" | Out-File -FilePath $logPath -Encoding utf8 -Append
  Write-Host 'PRISM backend is healthy on http://127.0.0.1:3000'
} catch {
  "[$(Get-Date -Format o)] backend health probe failed: $($_.Exception.Message)" | Out-File -FilePath $logPath -Encoding utf8 -Append
  Write-Warning 'PRISM backend did not come up cleanly. Check H:\PRISM\state\shared\codex-shell-mcp-repair.log'
}
