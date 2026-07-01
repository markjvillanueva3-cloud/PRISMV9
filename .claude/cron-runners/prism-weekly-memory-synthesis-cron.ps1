if ($env:PRISM_WEEKLY_SYNTHESIS_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path 'H:/prism'
& 'H:/Tools/nodejs/node.exe' scripts/weekly-memory-synthesis.mjs
