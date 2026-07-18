if ($env:PRISM_WEB_SOURCE_DRAIN_DISABLE -eq '1') { exit 0 }
Set-Location -Path 'H:/prism'
# U-WEB-SOURCE-DRAIN-CRON (slot:india 2026-06-25): autonomous NON-VIDEO web-article /learn harvest.
# Reads state/shared/web-source-extraction/web-source-queue.json (33 live-validated reputable sources),
# fetches the next due ones, strips HTML, runs Ollama tip-gen, and STAGES web-<hash>.json artifacts.
# --max-sources 4 keeps each run well under ~6 min: the fleet-reaper kills Ollama drains that exceed
# ~10 min (it killed the 33-at-once harvest at 16 sources). STAGING-ONLY; the 'PRISM Tribal Promotion
# Cron' (which runs promote-youtube-staged --apply) promotes the staged web-<hash> tips into the tribal
# store via U-TK01 content-dedup. Disable knob: PRISM_WEB_SOURCE_DRAIN_DISABLE=1.
& 'H:/Tools/nodejs/node.exe' scripts/drain-web-sources-tribal.mjs --max-sources 4 --max-chars 100000
