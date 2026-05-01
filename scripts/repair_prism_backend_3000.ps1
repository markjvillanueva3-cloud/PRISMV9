$ErrorActionPreference = 'Stop'

$port = 3000
$healthUrl = "http://127.0.0.1:$port/health"
$backendLog = "H:\PRISM\output\backend-$port.log"
$backendErrLog = "H:\PRISM\output\backend-$port.err.log"

function Test-HttpOk {
  param([Parameter(Mandatory = $true)][string]$Url)
  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listener) {
  $procId = $listener.OwningProcess
  try {
    Stop-Process -Id $procId -Force -ErrorAction Stop
    Start-Sleep -Milliseconds 500
  } catch {
    throw "Could not stop PID $procId on port $port. Run this script from an elevated PowerShell window."
  }
}

Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', "set PORT=$port&&npm run start:http > `"$backendLog`" 2> `"$backendErrLog`"" -WorkingDirectory 'H:\PRISM\mcp-server' | Out-Null

for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Milliseconds 750
  if (Test-HttpOk -Url $healthUrl) {
    Write-Output "PRISM backend restored on $healthUrl"
    exit 0
  }
}

throw "Backend did not become healthy on $healthUrl after restart."
