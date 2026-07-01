if ($env:PRISM_PDF_WATCHER_DISABLE -eq '1') { exit 0 }
Set-Location -Path 'H:/prism'
& 'H:/Tools/nodejs/node.exe' scripts/pdf-corpus-watcher-sweep.mjs
