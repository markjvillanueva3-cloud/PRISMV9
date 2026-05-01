$ErrorActionPreference = 'Stop'

$backendPort = 3001
$frontendPort = 3100
$backendHealthUrl = "http://127.0.0.1:$backendPort/health"
$calculatorUrl = "http://127.0.0.1:$frontendPort/calculator"
$frontendMachineProbeUrl = "http://127.0.0.1:$frontendPort/api/v1/data/machine/search"
$frontendHolderProbeUrl = "http://127.0.0.1:$frontendPort/api/v1/data/holder/catalog"
$backendLog = "H:\PRISM\output\backend-$backendPort.log"
$backendErrLog = "H:\PRISM\output\backend-$backendPort.err.log"
$frontendLog = "H:\PRISM\output\web-$frontendPort.log"
$frontendErrLog = "H:\PRISM\output\web-$frontendPort.err.log"

function Test-HttpOk {
  param(
    [Parameter(Mandatory = $true)][string]$Url
  )

  try {
    $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
    return $response.StatusCode -ge 200 -and $response.StatusCode -lt 400
  } catch {
    return $false
  }
}

function Test-JsonPostOk {
  param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][hashtable]$Body
  )

  try {
    $payload = $Body | ConvertTo-Json -Compress
    $response = Invoke-RestMethod -Method Post -Uri $Url -UseBasicParsing -TimeoutSec 5 -ContentType 'application/json' -Body $payload
    return $null -ne $response
  } catch {
    return $false
  }
}

function Start-BackgroundProcess {
  param(
    [Parameter(Mandatory = $true)][string]$Command,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory
  )

  Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', $Command -WorkingDirectory $WorkingDirectory | Out-Null
}

function Stop-FrontendProcess {
  $viteProcess = Get-CimInstance Win32_Process |
    Where-Object {
      $_.Name -eq 'node.exe' -and
      $_.CommandLine -like '*vite*' -and
      $_.CommandLine -like "*--port $frontendPort*"
    } |
    Select-Object -First 1

  if ($viteProcess) {
    Stop-Process -Id $viteProcess.ProcessId -Force
    Start-Sleep -Milliseconds 500
  }
}

function Start-BackendProcess {
  Start-BackgroundProcess -Command "set PORT=$backendPort&&npm run start:http > `"$backendLog`" 2> `"$backendErrLog`"" -WorkingDirectory 'H:\PRISM\mcp-server'
}

function Build-BackendDist {
  Push-Location 'H:\PRISM\mcp-server'
  try {
    npm run build:fast | Out-Host
  } finally {
    Pop-Location
  }
}

function Test-FrontendApiProbe {
  return (Test-JsonPostOk -Url $frontendMachineProbeUrl -Body @{ query = 'haas'; limit = 1 }) -and
    (Test-JsonPostOk -Url $frontendHolderProbeUrl -Body @{ mode = 'mill'; spindleConnectionTypeId = 'cat40'; limit = 1 })
}

if (-not (Test-HttpOk -Url $backendHealthUrl)) {
  Start-BackendProcess

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 750
    if (Test-HttpOk -Url $backendHealthUrl) {
      break
    }
  }
}

if (-not (Test-HttpOk -Url $backendHealthUrl)) {
  Build-BackendDist
  Start-BackendProcess

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 750
    if (Test-HttpOk -Url $backendHealthUrl) {
      break
    }
  }
}

if (-not (Test-HttpOk -Url $backendHealthUrl)) {
  throw "Calculator backend failed to start on port $backendPort."
}

if ((Test-HttpOk -Url $calculatorUrl) -and (-not (Test-FrontendApiProbe))) {
  Stop-FrontendProcess
}

if ((-not (Test-HttpOk -Url $calculatorUrl)) -or (-not (Test-FrontendApiProbe))) {
  Start-BackgroundProcess -Command "set PRISM_API_PORT=$backendPort&&npm run dev -- --host 0.0.0.0 --port $frontendPort > `"$frontendLog`" 2> `"$frontendErrLog`"" -WorkingDirectory 'H:\PRISM\mcp-server\web'

  for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 750
    if ((Test-HttpOk -Url $calculatorUrl) -and (Test-FrontendApiProbe)) {
      break
    }
  }
}

if ((-not (Test-HttpOk -Url $calculatorUrl)) -or (-not (Test-FrontendApiProbe))) {
  throw "Calculator frontend failed to start on port $frontendPort."
}

Start-Process $calculatorUrl | Out-Null
Write-Output "Calculator live stack ready: $calculatorUrl (API -> $backendHealthUrl)"
