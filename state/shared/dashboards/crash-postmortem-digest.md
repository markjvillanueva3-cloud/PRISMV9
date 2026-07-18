# Crash-Postmortem Digest

- Generated: 2026-06-10T01:36:53.177Z - window 7d - rows scanned: 1738
- Source: `state/shared/chat-crash-postmortems.jsonl` (+ rotated `.1`) - written by fleet-reaper-sweep, read by THIS digest (U-GOLF-CRASH-POSTMORTEM-DIGEST).

## Chat crashes (1738 total, 25 slot(s))
| slot | crashes | avg frozen (min) | last seen |
|------|---------|------------------|-----------|
| delta | 250 | 148 | 2026-06-10T01:15:58.335Z |
| lima | 250 | 95 | 2026-06-10T01:36:09.689Z |
| juliett | 105 | 65 | 2026-06-10T01:36:09.689Z |
| quebec | 101 | 67 | 2026-06-10T01:36:09.689Z |
| romeo | 101 | 43 | 2026-06-10T01:21:39.555Z |
| foxtrot | 97 | 124 | 2026-06-09T23:41:14.695Z |
| tango | 93 | 72 | 2026-06-10T01:36:09.689Z |
| victor | 93 | 72 | 2026-06-10T01:36:09.689Z |
| whiskey | 93 | 72 | 2026-06-10T01:36:09.689Z |
| xray | 93 | 72 | 2026-06-10T01:36:09.689Z |

Memory pressure at crash: normal 1550 / warn 186 / **critical 2** / unknown 0.
> 2 crash(es) under CRITICAL pressure -- a /compact-cadence issue, route to the fleet-memory-monitor advisory, not a code bug.

## Safety-net re-enable ledger
_No re-enable events in window (ledger empty or absent -- the G10 guard fired no heals, or the ledger has not yet accumulated)._
