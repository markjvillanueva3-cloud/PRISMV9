$json = Get-Content 'C:\PRISM\knowledge\code-index\EXECUTION_CHAIN.json' -Raw | ConvertFrom-Json
foreach ($d in $json.dispatchers.PSObject.Properties) {
    $name = $d.Name
    $count = $d.Value.action_count
    Write-Host ("{0,-30} {1,3} actions" -f $name, $count)
}
Write-Host ""
Write-Host "Total dispatchers: $($json.summary.dispatcher_count)"
Write-Host "Total actions: $($json.summary.total_actions)"
Write-Host "Total engines: $($json.summary.engine_count)"