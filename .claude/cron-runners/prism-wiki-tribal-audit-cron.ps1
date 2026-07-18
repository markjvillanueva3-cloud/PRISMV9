if ($env:PRISM_WIKI_TRIBAL_AUDIT_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path 'H:/prism'
& 'H:/Tools/nodejs/node.exe' scripts/wiki-tribal-cross-ref-audit.mjs
& 'H:/Tools/nodejs/node.exe' scripts/audit-tribal-coverage-by-domain.mjs
