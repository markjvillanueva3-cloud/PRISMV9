---
title: Agent-Orchestration Open Source Atlas — the living-source curriculum for distributed coordination + consensus
galaxy: agent-orchestration
owner_slot: zebra
status: VERIFIED-PARTIAL
verified_by: "papa-source-atlas-meta (2026-06-10)"
verification_method: Every source below was WebFetch-confirmed reachable, free, and legal during creation on 2026-06-10. Confirmed live landing pages are cited in preference to raw binary PDFs (the raw raft.pdf / amazon-dynamo-sosp2007.pdf / bigtable-osdi06.pdf returned non-parseable binary to WebFetch, so the canonical free hosting page for each is cited instead — the page links to and hosts the free PDF). Two candidate links were dropped per the retry-once-then-drop rule: amazon.science/dynamo (HTTP 404) and raft.github.io/raft.pdf (binary unparseable; raft.github.io itself is already confirmed in the foundations entry and is cited as the site, not the raw PDF). This entry is the keep-learning DIRECTORY (where to keep studying) and deliberately does NOT re-explain the theory — that lives in agent-orchestration-foundations.md (synthesized theory) and agent-orchestration-applied-practice.md (practitioner gotchas), both read before writing this.
tags: [agent-orchestration, source-atlas, living-curriculum, distributed-systems, consensus, raft, mapreduce, dynamo, bigtable, leases, MIT-6824, MIT-6840, kleppmann, DDIA, tanenbaum, etcd, jepsen, free-courseware, keep-learning]
---

# Agent-Orchestration Open Source Atlas

The **living-source curriculum** for the agent-orchestration galaxy: a curated, kept-fresh directory of WHERE TO KEEP LEARNING distributed-coordination and consensus from reputable FREE / LEGAL sources, so this galaxy's knowledge never goes stagnant.

This entry is distinct from its two siblings — read those for the substance, this one for the directory:
- `agent-orchestration-foundations.md` — the *synthesized theory* (what MAS / MapReduce / FLP / Raft / 2PC / CAP / scheduling / leader-election ARE), each section cited to a confirmed source.
- `agent-orchestration-applied-practice.md` — the *practitioner gotchas* (lease-vs-lock, split-brain, heartbeat false-positives, lost-update races, thundering herd, jittered backoff).

The foundations entry cites the MIT 6.824 *schedule* and the MapReduce / Raft / CAP reference pages as theory citations. This atlas points one layer out: the full free **courses with labs**, the **video lecture series**, the **complete free textbooks**, the **official docs/standards**, the **interactive learners**, and the **living archives** an engineer returns to over months to keep this domain fresh. No theory is re-derived here.

**Honesty note (R12):** every URL in `## Sources` was fetched and confirmed reachable + free + legal on 2026-06-10. Where a raw PDF returned binary that WebFetch could not parse, the confirmed free landing page that hosts it is cited instead (never the unverified raw link). A short verified list beats a long fabricated one.

---

## 1. Free college courses (with labs)

The hands-on track — courses you can actually do, not just read about. The orchestrator-worker, replication, and consensus theory only sticks once you have built a MapReduce and a Raft.

- **MIT 6.5840 / 6.824 Distributed Systems — course home + labs** — https://pdos.csail.mit.edu/6.824/
  Teaches: the canonical graduate distributed-systems sequence, with five free programming labs — **Lab 1 MapReduce, Lab 2 Key/Value server, Lab 3 Raft, Lab 4 KV-over-Raft, Lab 5 Sharding**. Feeds: the orchestrator-worker (foundations §2) and leader-based consensus (foundations §4) made concrete — building Lab 3 Raft is the single best way to internalize why the galaxy's claim/heartbeat/quorum design is shaped the way it is.

- **MIT 6.824 schedule — the free paper reading list** — https://pdos.csail.mit.edu/6.824/schedule.html
  Teaches: the de-facto further-reading spine — direct links to MapReduce(2004), GFS(2003), Paxos, Raft-extended(2014), Linearizability, ZooKeeper(2010), Spanner(2012), Chain Replication(2004), FaRM(2015), IronFleet(2015), Memcached@Facebook(2013), Practical BFT(1999), Bitcoin(2008). Feeds: every advanced topic the galaxy might deepen into (the foundations Owner-gate flagged Paxos/linearizability/ZooKeeper/Spanner as the next pass — they are all linked free here). Note: the schedule links lecture *notes*, not videos.

- **MIT OpenCourseWare — 6.824 Distributed Computer Systems Engineering (Spring 2006)** — https://ocw.mit.edu/courses/6-824-distributed-computer-systems-engineering-spring-2006/
  Teaches: an earlier, fully-downloadable CC-licensed snapshot (Prof. Robert Morris) — lecture notes, curated readings, labs/projects, and exams, all under Creative Commons. Feeds: a stable, archival study set when the live 6.5840 page churns each term; good for the fundamentals (server design, naming, storage, fault tolerance) that underpin the galaxy's fan-out + re-execution model.

## 2. Lecture-video series (watch + re-watch)

The galaxy's video track. The MIT schedule does not publish videos, so the canonical free video course for this domain is Kleppmann's Cambridge series.

- **Martin Kleppmann — Distributed Systems (Cambridge), lecture notes + YouTube video series** — https://www.cl.cam.ac.uk/teaching/2021/ConcDisSys/
  Teaches: a complete ~8-lecture / ~7-hour free video series (on YouTube) plus an 87-page lecture-notes PDF and slides, all released CC BY-SA. Covers system models, physical + logical clocks, broadcast protocols, replication, **consensus (Raft)**, and consistency models. Feeds: the consensus + leader-election + replication core of the galaxy (foundations §3-§5) with a teaching voice that pairs perfectly with the same author's DDIA below; the logical-clocks + broadcast material directly informs how fleet slots reason about shared-state ordering.

- **The Secret Lives of Data — interactive Raft visualizer** — https://thesecretlivesofdata.com/raft/
  Teaches: an animated, step-through walkthrough of Raft **leader election** and **log replication** — terms, votes, heartbeats, and majority-commit, watched rather than read. Feeds: the fastest way to refresh the leader/term/heartbeat/quorum mental model (foundations §4) that the slot-claim + reaper design is an instance of; ideal for re-grounding before touching ownership/heartbeat code.

## 3. Free textbooks & reference books

The deep-reference shelf — returned to for the "why," not skimmed once.

- **Designing Data-Intensive Applications (DDIA) — official site, Martin Kleppmann** — https://dataintensive.net/
  Teaches: the practitioner bible for replication, partitioning, transactions, consistency + consensus tradeoffs, and the realities of distributed data. The official site hosts the table of contents, the downloadable concept poster, translations, and author links. Feeds: the CAP / 2PC / consensus tradeoff reasoning (foundations §6-§7) at production depth — the chapters on consistency and consensus are the canonical bridge from the galaxy's theory to real shared-state design decisions.

- **Distributed Systems, 3rd ed. — van Steen & Tanenbaum (free personalized digital copy)** — https://www.distributed-systems.net/index.php/books/ds3/
  Teaches: a complete classic textbook covering architectures, processes, communication, naming, coordination, consistency + replication, and fault tolerance. The authors offer a **free personalized digital copy** plus free figures, slides, and Python code samples (legal free access; not a paywall). Feeds: the broad foundation under every section of the galaxy — especially the coordination + fault-tolerance chapters that map onto leader election (foundations §5) and failure handling.

## 4. Primary research papers (free, canonical)

The galaxy's source-of-truth papers. Cited here at their confirmed free landing pages (the raw PDFs are linked from each).

- **MapReduce: Simplified Data Processing on Large Clusters (Dean & Ghemawat, OSDI 2004)** — linked free from the MIT 6.824 schedule above, and hosted at https://static.googleusercontent.com/media/research.google.com/en//archive/mapreduce-osdi04.pdf (this exact PDF is WebFetch-confirmed in agent-orchestration-foundations.md). Teaches: the master-worker decomposition + re-execution-on-failure model. Feeds: the orchestrator-worker pattern + task-reclaim design (foundations §2).

- **Dynamo: Amazon's Highly Available Key-value Store (DeCandia et al., SOSP 2007)** — https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html
  Teaches: high-availability design under partition — consistent hashing, vector clocks, quorum reads/writes, and application-assisted conflict resolution (it deliberately "sacrifices consistency under certain failure scenarios"). The free SOSP-2007 PDF is hosted from this Werner-Vogels page. Feeds: the CAP "choose availability vs consistency under partition" decision (foundations §7) and the quorum + lost-update reasoning (applied-practice §2, §4) — Dynamo is the canonical AP-leaning counterpoint to the galaxy's CP-leaning bias for canonical artifacts.

- **Bigtable: A Distributed Storage System for Structured Data (Chang et al., OSDI 2006)** — https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/
  Teaches: a distributed structured-storage system layered over GFS + Chubby (lock service), with a free PDF download on the Google Research publication page. Feeds: how a coordination/lock service underpins distributed storage — directly relevant to the galaxy's lease/lock + single-coordinator-over-replicated-state concerns (foundations §5-§6, applied-practice §1).

## 5. Official docs & standards (the production reference)

Where the theory is operationalized in a real, free, open-source coordination system — the docs an engineer reads when implementing, not theorizing.

- **etcd documentation — Raft, leases, elections, distributed locks** — https://etcd.io/docs/latest/learning/why/
  Teaches: the official, Linux-Foundation-maintained docs for etcd, a production Raft-based coordination store. Documents its **Raft** commit path, **leases** with TTL revocation ("when the server detects the passage of time longer than the TTL, it revokes the lease"), and out-of-the-box **leader elections + distributed shared locks**. Feeds: nearly every applied-practice gotcha at once — lease-vs-lock (§1), the lease-expiry-needs-fencing subtlety (§1.2), and quorum-based split-brain avoidance (§2) — as a concrete, free, readable implementation reference the galaxy can pattern-match its claim/heartbeat machinery against.

## 6. Living archives & data (keep it from going stale)

The "what actually breaks in production" feed — refreshed by others continuously, so the galaxy's failure-mode intuition stays current.

- **Jepsen — distributed-systems safety analyses** — https://jepsen.io/analyses
  Teaches: a free, continuously-growing archive (since 2013) of opaque-box correctness testing against 2+ dozen real databases + coordination services + queues (Mongo, Postgres, Cassandra, Redis, Kafka, etcd, and more), surfacing replica divergence, data loss, stale reads, read skew, and lock conflicts under real network faults + clock skew + partial failure. Feeds: the practitioner failure-mode layer (applied-practice §2 split-brain, §3 failure detection, §4 lost-update, §5 delivery/retries) with *fresh evidence from real systems* — the single best source for keeping the galaxy's "what goes wrong when agents coordinate over shared state" knowledge from stagnating, because new analyses keep arriving.

---

## Keep-fresh cadence

This atlas is a living directory, not a one-time dump. Suggested maintenance so the curriculum does not rot:

- **Per session that touches this galaxy** — if a new free coordination/consensus source is encountered, add it here (one line, with a WebFetch-confirmed URL); never add an unverified link.
- **Quarterly** — re-fetch each `## Sources` URL; the MIT course page rotates term-to-term (6.824 -> 6.5840; the live home page and schedule move each year), so re-confirm the current-term path and refresh the lab list. Drop any link that 404s after one retry (retry-once-then-drop).
- **On any new Jepsen analysis of a coordination system** (etcd, ZooKeeper, Consul, a Raft/Paxos store) — note it; it is direct, current evidence for the applied-practice failure modes.
- **When the foundations Owner-gate "next pass" lands** (Paxos / linearizability / ZooKeeper / Spanner / chain replication) — those papers are all already linked free from the MIT 6.824 schedule above; promote the specific paper URL into `## 4` here as it is studied.
- **Owner check (zebra):** all PRISM-internal "feeds" mappings are interpretive design-guidance (which galaxy concern each source informs), consistent with the Owner-gate notes in both sibling entries — the *sources* are confirmed; the *mapping to PRISM hooks* is analogy, not measured equivalence. No machining/physics safety thresholds appear here by design (n/a for this coordination domain).

## Sources (distinct URLs WebFetch-confirmed live, free, and legal on 2026-06-10)

> Each URL below was fetched and confirmed reachable + free + legal before being listed. Confirmed free landing pages are cited in preference to raw binary PDFs. Two candidates were dropped as unreachable/unconfirmable: `https://www.amazon.science/dynamo` (HTTP 404) and `https://raft.github.io/raft.pdf` (binary unparseable to WebFetch; raft.github.io is confirmed in the foundations entry and cited there, not re-listed as a raw PDF).

- **MIT 6.5840 / 6.824 Distributed Systems — home + 5 free labs** (free courseware) — https://pdos.csail.mit.edu/6.824/
- **MIT 6.824 Distributed Systems — schedule + free paper reading list** (free courseware) — https://pdos.csail.mit.edu/6.824/schedule.html
- **MIT OpenCourseWare — 6.824 Distributed Computer Systems Engineering (Spring 2006)** (free CC-licensed OCW) — https://ocw.mit.edu/courses/6-824-distributed-computer-systems-engineering-spring-2006/
- **Martin Kleppmann — Distributed Systems (Cambridge): CC BY-SA notes + YouTube video series** (free) — https://www.cl.cam.ac.uk/teaching/2021/ConcDisSys/
- **The Secret Lives of Data — interactive Raft visualizer** (free interactive resource) — https://thesecretlivesofdata.com/raft/
- **Designing Data-Intensive Applications (DDIA) — official site** (free site: TOC, poster, references) — https://dataintensive.net/
- **Distributed Systems, 3rd ed. — van Steen & Tanenbaum** (free personalized digital copy + slides/code) — https://www.distributed-systems.net/index.php/books/ds3/
- **Dynamo: Amazon's Highly Available Key-value Store (SOSP 2007)** (free paper, All Things Distributed) — https://www.allthingsdistributed.com/2007/10/amazons_dynamo.html
- **Bigtable: A Distributed Storage System for Structured Data (OSDI 2006)** (free paper, Google Research) — https://research.google/pubs/bigtable-a-distributed-storage-system-for-structured-data/
- **etcd documentation — Raft / leases / elections / distributed locks** (free official docs, Linux Foundation) — https://etcd.io/docs/latest/learning/why/
- **Jepsen — distributed-systems safety analyses** (free living archive) — https://jepsen.io/analyses
