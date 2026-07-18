Durable home for scheduled-task runner scripts (OBSIDIAN-RECALL-MEASURE / cron-runner-durability-fix 2026-06-09).
The install-*-cron.ps1 helpers previously wrote their runner .ps1 to $env:TEMP, which the
tmp-orphan janitor (scripts/tmp-orphan-janitor.mjs) reaps -> tasks ended up pointing at deleted
scripts (LastTaskResult 0x41303 'task has not yet run'). Writing them here keeps them durable
across temp sweeps and reboots. Do NOT add this dir to any reaper sweep path.
