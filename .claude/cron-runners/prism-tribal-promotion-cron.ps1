if ($env:PRISM_TRIBAL_PROMOTION_CRON_DISABLE -eq '1') { exit 0 }
Set-Location -Path 'H:/prism'
# U-YT-PROMOTE-CRON-WIRE (slot:india 2026-06-25): close the video /learn loop.
# youtube-night-extract STAGES tips nightly but nothing promoted them into the
# tribal store -> ~28 CAD/machining videos pooled in staging since 2026-06-12.
# Step 1: promote staged YouTube tips -> TribalKnowledgeEngine (U-TK01 content-dedup;
#   --no-wiki so the tribal->wiki step below owns wiki, no double-write). Fail-soft:
#   a native non-zero exit does NOT abort PowerShell, so step 2 always runs.
& 'H:/Tools/nodejs/node.exe' scripts/promote-youtube-staged.mjs --apply --no-wiki
# Step 2: promote high-confidence tribal (incl the just-added video tips) -> wiki.
# THRESHOLD IS 0-100 (DEFAULT_THRESHOLD=90 in promote-tribal-to-wiki.mjs; shouldPromote = conf>=threshold).
# The CLI parses it with parseInt(v,10), so a fractional 0.9 -> 0 -> promote-EVERYTHING (the gate collapses,
# leaking conf-60 video tips into wiki). KEEP THIS AN INTEGER 0-100 (90 = the canonical high-confidence bar).
& 'H:/Tools/nodejs/node.exe' scripts/promote-tribal-to-wiki.mjs --apply --threshold 90
