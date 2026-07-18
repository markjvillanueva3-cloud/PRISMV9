---
title: Dormant-Data Applied Practice — GC/storage-lifecycle practitioner gotchas, failure modes, and technique decisions
galaxy: dormant-data
owner_slot: victor
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice-meta (2026-06-10)"
verification_method: "Practitioner gotchas WebFetch-confirmed against free/legal primary sources: the unlink(2) Linux man page (man7.org), official PostgreSQL routine-vacuuming docs (postgresql.org), Oracle Java SE 17 java.lang.ref package docs (docs.oracle.com), OSTEP free OS textbook (cs.wisc.edu, free PDF), and well-referenced encyclopedic articles on TOCTOU, cache-replacement weaknesses, log-structured-filesystem cleaning, and crypto-shredding. Each gotcha quotes the source inline and maps to how the dormant-data galaxy hits it. DISTINCT from dormant-data-foundations.md (theory) — this entry is the practitioner layer: what goes wrong and how an expert avoids it. Benchmark-specific numbers (retention windows, temperature thresholds) left Owner-gated."
tags: [dormant-data, applied-practice, garbage-collection, reachability, reference-counting, cycles, premature-reclaim, toctou, unlink, cache-pollution, lru, lfu, belady, log-structured, segment-cleaning, vacuum, mvcc, dead-tuple, xid-wraparound, retention-gap, crypto-shredding, java-references, tribal-knowledge]
---

This is the PRACTITIONER layer for the dormant-data galaxy (owner: victor) — the hard-won gotchas that pure GC/storage theory does not teach. The foundations entry (`dormant-data-foundations.md`) established the theory (reachability, mark-sweep, HSM tiering, working set, retention). Read it first. This entry assumes that theory and answers the operational question: **what goes wrong when you actually build a dormant-data ledger / reclaimer, and how does an expert avoid it?** The fleet has already drawn blood on several of these (the fail-OPEN tribal-brain clobber `a3e6d3ca9`, the ~19 GB tmp-orphan leak `87454e9cf`), so these are not hypothetical.

---

## 1. Detecting dead data: the cheap signal lies

### Gotcha 1.1 — Reference counting silently keeps dead cycles alive forever
The cheapest "is this orphaned?" signal is counting inbound references (0 inbound = dead). But the practitioner trap is the cycle: two artifacts that point at each other keep each other's count above zero even when the whole pair is garbage. Reference counting "cannot detect... reference cycles, and so even with a reference count it is necessary to provide some other garbage collection mechanism to deal with cycles" — naive refcounting "can't handle reference cycles" [Reference counting, Wikipedia — confirmed]. The expert never ships refcount-only orphan detection: they pair it with a periodic tracing/reachability pass (mark from real roots) that DOES catch cycles, exactly as production refcounted runtimes bolt on a cycle collector.
- **Galaxy hit:** an index A that points to corpus B while B back-points A (the tribal-index ↔ embed-sidecar shape) can both be dead yet show `inbound > 0`. A dormant-data orphan audit that only counts edges will miss the dead cycle. Use the foundations §5 tracing pass as the authority; refcount is only the fast pre-filter.

### Gotcha 1.2 — One surviving strong reference is enough to leak the whole graph
In a reachability model "only unreachable objects... are eligible for reclamation," and the practitioner consequence is brutal: **holding even a single strong reference from a root prevents collection** of an object and everything it transitively reaches [Oracle, java.lang.ref package summary — confirmed: "An object is strongly reachable if it can be reached by some thread without traversing any reference objects"]. A leak is rarely "GC is broken" — it is one forgotten live edge (a cache map, a listener list, a static registry) pinning a subtree. The expert debugs a suspected dormant-data leak by finding the unexpected *retaining* edge, not by re-tuning the sweep.
- **Galaxy hit:** an artifact the ledger believes is cold/orphaned but never gets reclaimed almost always still has one live consumer the edge-graph didn't model (a hardcoded path read, a cron job, a stale registry entry). The reclaimer must trace from the *true* root set (dispatchers + skills + active engines + scheduled tasks), or it will both miss leaks and — worse — be tempted to reap something still pinned.

### Gotcha 1.3 — Use soft/weak distinctions, don't treat "cache" and "live data" the same
Java's reference tiers encode a practitioner truth: a memory-sensitive cache should be *softly* reachable ("reached by traversing a soft reference," cleared "at the discretion of the garbage collector in response to memory demand"), while a non-pinning back-pointer should be *weakly* reachable [Oracle, java.lang.ref — confirmed]. Treating a regenerable cache as ground-truth live data means you never reclaim it under pressure; treating real data as a clearable cache means you lose it. The expert classifies each dormant-data artifact by *regenerability*, not just temperature.
- **Galaxy hit:** a 644 MB regenerable sidecar (rebuildable from the canonical graph) is "soft" — safe to reclaim under disk pressure and rebuild on demand. The canonical graph itself is "strong" — reclaiming it is data loss. The ledger must carry a regenerable/canonical flag, not classify both purely by access age.

---

## 2. Reclaiming safely: premature reclaim is the expensive failure

### Gotcha 2.1 — A "dead" row can still be visible to a concurrent reader (MVCC premature-reclaim)
The single most important production gotcha: deleted/updated data is NOT immediately reclaimable, because a concurrent transaction may still need the old version. PostgreSQL is explicit: "an UPDATE or DELETE of a row does not immediately remove the old version of the row. This approach is necessary to gain the benefits of multiversion concurrency control (MVCC)... **the row version must not be deleted while it is still potentially visible to other transactions**" [PostgreSQL routine-vacuuming docs — confirmed]. Reclaiming a version still inside someone's snapshot corrupts that reader. The expert reclaimer proves *no live snapshot references the data* before freeing — it does not free on "logically deleted" alone.
- **Galaxy hit:** this is the dangling-read failure class (foundations §9) stated as a rule. A dormant-data reaper that unlinks an artifact a still-running chat has open-and-mid-read produces exactly the MVCC violation. The reclaim gate must check active consumers, mirroring the tri-color "don't reap mid-write" invariant.

### Gotcha 2.2 — On Unix, unlink() does NOT free space while a file is open (silent retention)
The mirror-image gotcha that fools disk-reclaim scripts: `unlink(2)` removes the *name* immediately but defers space reclamation. "If the name was the last link to a file but any processes still have the file open, the file will remain in existence until the last file descriptor referring to it is closed" [unlink(2), man7.org — confirmed]. So `du`/`df` won't drop, the file vanishes from `ls`, and a naive janitor reports "reclaimed N bytes" while the space is still held by a long-lived reader. The expert verifies via the holding process (close it or check `/proc/*/fd`), not the directory listing.
- **Galaxy hit:** a dormant-data sweep that unlinks a tmp/staging file open by a stuck MCP process will look successful yet free nothing — and the "freed" claim violates R12. Report reclaimed bytes from actual `df` delta after FD closure, never from the unlink count.

### Gotcha 2.3 — TOCTOU: the file you checked is not the file you delete
Between "is this orphaned/safe-to-delete?" and the `unlink`, the path can be swapped. TOCTOU is "a class of software bugs caused by a race condition involving the checking of the state of a part of a system... and the use of the results of that check" — the classic Unix case checks a file then operates on a path an attacker has replaced with a symlink, because "it's possible for other programs that run concurrently with this program to execute in between" the check and the use [Time-of-check to time-of-use, Wikipedia — confirmed]. The recommended fix is to drop path-re-resolution: operate on a held handle/file descriptor and use error handling rather than a pre-check ("easier to ask for forgiveness than permission") [same source].
- **Galaxy hit:** a reaper that does `stat(path)` → "cold, orphaned" → later `unlink(path)` can delete a file that was recreated/replaced in the gap (a peer chat re-wrote it; this fleet runs up to 26 concurrent slots). Hold a descriptor, or re-validate identity (inode/content hash) atomically at delete — never trust the earlier check across the gap.

### Gotcha 2.4 — Segment/log cleaners must confirm a block is live before erasing it
Log-structured reclaimers make the same safety contract concrete. An LFS cleaner reclaims a segment only after relocating data that is still current: "The tail can release space and move forward by skipping over data where newer versions exist further ahead in the log" — and if a newer version does NOT exist, the live data must be copied forward before the old segment is freed [Log-structured file system, Wikipedia — confirmed]. You cannot erase a segment until you've established which blocks within it are dead. The expert's reclaimer is always *copy-live-forward, then free* — never *free, then hope nothing was live*.
- **Galaxy hit:** when the ledger compacts/rewrites a corpus densely (foundations §8 mark-compact), it must carry forward every still-referenced record before truncating the old store. This is also why a corpus rewrite must be atomic with its offset index — the fail-OPEN clobber (`a3e6d3ca9`) was precisely a reclaim that freed before proving the live set was preserved.

---

## 3. Hot/cold classification: age and recency both betray you

### Gotcha 3.1 — Age != unreachable, and recency != hot (the scan/pollution trap)
An LRU "coldest by recency" demotion is fooled by a one-time bulk scan: "Many cache algorithms (particularly LRU) allow streaming data to fill the cache, pushing out information which will soon be used again (cache pollution)" [Cache replacement policies, Wikipedia — confirmed]. A full audit/backup/migration pass that touches *everything* makes recently-untouched-but-hot data look cold (it was evicted by the scan), and makes genuinely-dead data look freshly-touched. The expert makes the reclaimer *scan-resistant* — exclude the audit's own access from the recency signal, or use scan-resistant policies (segmented/LFUDA, per the same source) rather than vanilla LRU.
- **Galaxy hit:** the fleet has lived this: "a full scan demoting hot data." When a dormant-data audit walks every artifact to classify it, the walk itself updates access timestamps — so the next pass sees the audit's footprints, not real demand. Tag audit reads as non-demand, or classify from a demand log the audit doesn't write to.

### Gotcha 3.2 — LFU keeps zombies: once-popular, now-dead data never ages out
Frequency-based classification has the opposite trap: "If an object was frequently accessed in the past and becomes unpopular, it will remain in the cache for a long time" [Cache replacement policies, Wikipedia — confirmed]. A row hammered for a year then abandoned keeps a sky-high count and is treated as hot forever. The flip side of the focus-area "a 1-year-old hot row" is the "once-hot now-zombie row." The expert applies *aging/decay* to frequency counts (LFUDA — dynamic aging) so historical popularity decays, instead of trusting a raw lifetime counter.
- **Galaxy hit:** classifying artifacts by raw access count pins formerly-hot corpora (an old completed-milestone ledger) as permanently hot. Decay the frequency, or combine frequency with recency (foundations §3/§4) so a long-dead-but-historically-busy artifact can still be classified dormant.

### Gotcha 3.3 — The optimal "what's truly cold" oracle is unimplementable — stop chasing it
Belady's optimal (evict the item used farthest in the future) is provably best and provably impossible to run online: "Since it is generally impossible to predict how far in the future information will be needed, this is unfeasible in practice" [Cache replacement policies, Wikipedia — confirmed]. The practitioner lesson is to *stop trying to perfectly predict* dormancy and instead pick a defensible heuristic (recency/frequency/working-set window) plus a safety margin and a recall path. OSTEP frames the entire OS as managing exactly these resource-reclamation tradeoffs under uncertainty across virtualization, concurrency, and persistence [OSTEP, Arpaci-Dusseau, cs.wisc.edu — confirmed: "this book is and will always be free in PDF form"; covers the three pieces].
- **Galaxy hit:** there is no perfect "is this dormant?" classifier. The ledger should commit to a tunable, auditable heuristic (working-set window τ, foundations §4) plus a cheap recall when a "cold" artifact is touched — not a clever predictor that occasionally reaps a hot row. A demote that's wrong is a cache miss; a reap that's wrong is data loss.

---

## 4. Retention and disposal: the gaps that lose required records

### Gotcha 4.1 — Not reclaiming is also a failure mode: unbounded growth → catastrophic loss
Practitioners frame reclamation as merely freeing space, but PostgreSQL shows the opposite extreme is fatal: if dead versions are never reclaimed, transaction IDs eventually wrap — "the XID counter wraps around to zero, and all of a sudden transactions that were in the past appear to be in the future... which means their output become invisible. In short, **catastrophic data loss**" — so "it is necessary to vacuum every table in every database at least once every two billion transactions" [PostgreSQL routine-vacuuming docs — confirmed]. The system even refuses new write transactions before wraparound. The expert treats *failing to reclaim on schedule* as a first-class operational hazard, not just an efficiency loss.
- **Galaxy hit:** a dormant-data ledger that only ever *advises* and never closes the loop lets dead data accumulate (the ~19 GB tmp-orphan leak, `87454e9cf`) — and the analogous PRISM hazard is index files crossing hard limits (the tribal index crossed V8's 512 MiB string cap, `182788232a`, killing fleet-wide injection). Reclamation has a *deadline*, not just a budget.

### Gotcha 4.2 — A retention-policy gap deletes records you were required to keep (and keeps ones you must delete)
The disposal trigger is policy, not a temperature signal — and getting the policy boundary wrong cuts both ways. The discipline is to encode an explicit per-class retention period whose objective includes "dispose of information no longer needed" while *preserving* what must be kept (foundations §10). The practitioner gap: classifying a still-required record as "cold N days → reap" deletes a compliance/audit artifact; classifying a must-purge record as "historically hot → keep" retains data past its mandated deletion. The expert never lets the dormancy signal alone authorize disposal — disposal is gated on a retention class.
- **Galaxy hit:** JM Die customer/quote/financial artifacts and intake PII have retention obligations that a pure access-age signal is blind to. A cold-for-N-days artifact may still be a required record; the ledger must look up the artifact's retention class before any disposal, exactly as foundations §10/Owner-gate requires. Auto-reap on temperature alone is a retention-gap bug waiting to happen.

### Gotcha 4.3 — Crypto-shredding is "deleted" only if EVERY key copy is gone
For large/replicated datasets, disposal is often crypto-shredding — "rendering encrypted data unusable by deliberately deleting or overwriting the encryption keys" rather than overwriting every copy [Crypto-shredding, Wikipedia — confirmed]. The practitioner trap is key survival: the technique is "only as strong as" key management, and "has no effect when a symmetric or asymmetric encryption key has already been compromised" or backed up somewhere the disposal missed [same source]. A surviving key copy means the "destroyed" data is fully recoverable — a false-disposal that violates the retention guarantee just as badly as a missed delete.
- **Galaxy hit:** if the galaxy ever adopts crypto-erase to dispose of replicated/cold corpora cheaply (instead of overwriting every mirror across C:/H:/backups), the reclaim is real ONLY if every key copy is destroyed. A key surviving in a backup, a secret manager, or an env file means the disposal lied. This is Owner-gated (security policy), but the gotcha is recorded so the galaxy never treats key-deletion as complete without auditing key copies.

---

## 5. Process discipline (the meta-gotchas)

### Gotcha 5.1 — "Reclaimed N bytes" / "purged" must be measured, not assumed (R12)
Three confirmed mechanisms above each produce a *false success report*: `unlink` while a file is open frees nothing yet returns success (2.2); crypto-shred with a surviving key reports "destroyed" but isn't (4.3); a TOCTOU-swapped target reports "deleted the orphan" but deleted something else (2.3). The expert's rule, grounded in these, is that every reclamation claim is verified against ground truth — actual `df`/`du` delta after FD closure, actual key-copy inventory, actual identity re-check at delete — never the count of operations issued.
- **Galaxy hit:** this is R12 (fail loud) made concrete for the reaper. A dormant-data run that says "reclaimed 19 GB" must prove it from a before/after free-space measurement, or it is the same lie class as "tests pass" with a `.skip`.

### Gotcha 5.2 — Reclamation competes with the live workload; throttle it
LFS makes the cost explicit: garbage collection / segment cleaning consumes I/O and adds write amplification, and the segment-selection heuristic exists specifically to "decrease the I/O load (and decrease the write amplification) of the garbage collector" [Log-structured file system, Wikipedia — confirmed]. A reclaimer that runs flat-out competes with the very work it serves. The expert schedules reclamation off-peak / incrementally (foundations §5 incremental vs stop-the-world) and bounds its rate.
- **Galaxy hit:** a dormant-data sweep over the 644 MB graph or the multi-hundred-MB indexes must not run unthrottled while 26 slots are live — it will starve them (this is the fleet-reaper / memory-monitor coordination concern). Run it phased and rate-limited, classify-then-reclaim in passes, not one stop-the-world walk.

---

## Owner-gate (NOT promoted)
Deliberately left for victor (owner) + operator, NOT asserted as live policy by this practitioner entry:
- **Temperature thresholds + working-set window τ.** The numeric "cold for N days = dormant" cutoff, the LRU-vs-LFU-vs-working-set choice, and any frequency-decay half-life (Gotcha 3.2) must be validated against live fleet access traces before any auto-demote fires. No number is asserted here.
- **Retention periods per artifact class.** Which JM Die customer/quote/financial/PII classes have which mandated retention windows (Gotcha 4.2) is an operator/compliance decision — the ledger enforces it once set; this entry does not set it.
- **Crypto-shred adoption + key-copy audit policy.** Whether to crypto-erase cold corpora at all, and the key-copy inventory that must be proven empty before declaring disposal complete (Gotcha 4.3), is a security-policy call. Recorded as a gotcha, not adopted.
- **Auto-reap autonomy.** Per foundations Owner-gate: auto-reap stays advisory until a tracing reachability gate (Gotcha 1.1) + active-consumer / no-dangling-snapshot check (Gotcha 2.1) + measured-success verification (Gotcha 5.1) are all wired. Edge-count + age alone never authorize a delete.

## Sources (distinct URLs WebFetch-confirmed for this entry, 2026-06-10)
- unlink(2) Linux man page (deferred space reclamation while a file is open) — https://man7.org/linux/man-pages/man2/unlink.2.html
- Time-of-check to time-of-use (TOCTOU race; access()/open() classic; EAFP/handle fix) — https://en.wikipedia.org/wiki/Time-of-check_to_time-of-use
- PostgreSQL routine vacuuming (MVCC dead-tuple visibility; premature reclaim; XID wraparound catastrophic data loss) — https://www.postgresql.org/docs/current/routine-vacuuming.html
- Cache replacement policies (LRU cache pollution; LFU aging/zombies; Belady unimplementable) — https://en.wikipedia.org/wiki/Cache_replacement_policies
- Log-structured file system (segment cleaning; copy-live-forward before free; GC cost / write amplification) — https://en.wikipedia.org/wiki/Log-structured_file_system
- Crypto-shredding (key-deletion disposal; only as strong as key management; surviving key = false disposal) — https://en.wikipedia.org/wiki/Crypto-shredding
- Oracle Java SE 17 java.lang.ref package (reachability tiers; strong-ref leak; soft/weak/phantom) — https://docs.oracle.com/en/java/javase/17/docs/api/java.base/java/lang/ref/package-summary.html
- Reference counting (cycle blind spot — cross-ref to foundations §7) — https://en.wikipedia.org/wiki/Reference_counting
- OSTEP, Operating Systems: Three Easy Pieces, Arpaci-Dusseau (free OS textbook; reclamation under uncertainty across virtualization/concurrency/persistence) — https://pages.cs.wisc.edu/~remzi/OSTEP/

## Cross-refs
- Theory layer (read first): `knowledge/wiki/dormant-data/dormant-data-foundations.md`
- Galaxy memory: `mcp-server/src/engines/dormant-data/MEMORY.md` (dormant/orphan-data ledger, victor)
- Fleet precedent: tmp-orphan janitor `87454e9cf` (~19.24 GB reclaimed — Gotcha 4.1 leak); fail-OPEN tribal-brain clobber `a3e6d3ca9` (Gotcha 2.1/2.4 premature-reclaim/free-before-prove-live); tribal index V8 512 MiB string-cap `182788232a` (Gotcha 4.1 unbounded-growth hazard).
