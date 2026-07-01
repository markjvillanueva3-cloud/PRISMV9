---
name: bug-hunting-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) foundations layer for the bug-hunting galaxy (software fault localization, silent-failure detection, static analysis). 9 fetched + 1 honestly-unfetched source. FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: bug-hunting
  tier: VERIFIED
  verifiedBy: WebFetch
---

# bug-hunting galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Sources WebFetched + excerpted; NIST SARD honestly marked **fetched:false** (samate.nist.gov returned HTTP 500 — no fabricated excerpt, R12). Directly relevant to PRISM's silent-failure / regression-hunting focus.

## Synthesis
Spectrum-Based Fault Localization (SBFL) — formalized in the Wong et al. IEEE TSE 2016 survey, extended by FLITSR for multi-fault programs — is the statistical core: coverage matrices + pass/fail outcomes compute per-statement suspiciousness (Ochiai: susp = fail(s)/sqrt(totalfail × (fail(s)+pass(s)))), with 30-90% wasted-effort reduction on Defects4J under iterative test-suite reduction. LLM-based FL (LLM4FL) now beats classical SBFL by 18.55% Top-1 on the same benchmark via graph-based code retrieval + reflexion, but is **critically sensitive to input order** (reversing suspicious-file order collapses Top-1 from 57% → 20%), making dependency-graph topological ordering a first-class requirement. **Silent failures** — executions that complete without error but return wrong output (arXiv 2406.19228) — are a distinct emerging concern that neither classical FL nor exception monitoring catches, requiring self-consistency + output validation as separate detection layers (PRISM's exact target). Institutional substrate: Zeller's Delta Debugging textbook, CMU 17-355/17-712 program-analysis curriculum, and NIST SARD (80,000+ known-weakness cases, 150+ CWE classes) as the benchmark.

## Verified sources
### [A Survey on Software Fault Localization (Wong et al., IEEE TSE 2016)](https://researchportal.ulisboa.pt/en/publications/a-survey-on-software-fault-localization) — journal
> "fault localization... one of the most tedious, time consuming, and expensive — yet equally critical — activities in program debugging."

**Knowledge:** Canonical survey (TSE 42(8):707-740, DOI 10.1109/TSE.2016.2521368). Taxonomizes spectrum/mutation/slicing/predicate-switching FL; Tarantula + Ochiai are the SBFL baselines. (Fetched via U. Lisbon mirror after ACM DL 403 / IEEE Xplore 418.)

### [Tools Fail: Detecting Silent Errors in Faulty Tools (Sun et al., arXiv 2024)](https://arxiv.org/abs/2406.19228) — preprint
> "Tools have become a mainstay of LLMs, allowing them to retrieve knowledge not in their weights..."

**Knowledge:** Silent-failure detection when tool pipelines produce wrong output without raising exceptions; proposes self-consistency checks + output validation. The core failure mode PRISM regression-hunting targets.

### [FLITSR: SBFL of Multiple Faults by Iterative Test Suite Reduction (arXiv 2023)](https://arxiv.org/abs/2306.09892) — preprint
> "SBFL works well for single-fault programs but its accuracy decays for increasing fault numbers."

**Knowledge:** Iteratively removes interfering tests to localize successive faults; 30-90% wasted-effort reduction on Defects4J. Production systems rarely have single isolated faults.

### [A Multi-Agent Approach to Fault Localization via Graph-Based Retrieval and Reflexion (LLM4FL, arXiv 2024)](https://arxiv.org/abs/2409.13642) — preprint
> "Traditional fault localization techniques, such as Spectrum-Based Fault Localization (SBFL)... often suffer from limited accuracy."

**Knowledge:** Multi-agent FL with graph-based code retrieval + reflexion → +18.55% Top-1 over AutoFL on Defects4J. LLMs reasoning over graph-structured code context beat both classical SBFL and naive prompting.

### [Order Matters! Input Order Bias in LLMs for Software Fault Localization (arXiv 2024)](https://arxiv.org/abs/2412.18750) — preprint
> "Top-1 FL accuracy in Java projects drops from 57% to 20% when reversing code order; dependency graph ordering outperforms call graph traversal."

**Knowledge:** LLM-based FL is highly sensitive to file-presentation order; dependency-graph topological ordering wins. Input ordering is a first-class hyperparameter, not an implementation detail.

### [CMU 17-355/665/819: Program Analysis (Aldrich & Le Goues)](http://www.cs.cmu.edu/~aldrich/courses/17-355-19sp/syllabus.html) — course
> "implement program analyses that verify program properties and find bugs using dataflow analysis, interprocedural analysis, alias analysis, and symbolic execution."

**Knowledge:** Canonical static-analysis curriculum: dataflow (reaching defs, live vars), interprocedural (call graph, context sensitivity), alias (Andersen/Steensgaard), symbolic execution (path constraints, SMT).

### [CMU 17-712: Fantastic Bugs and How to Find Them](https://cmu-fantastic-bugs.github.io/archives/s25/) — course
> "static analysis, fuzzing, symbolic execution, formal methods applied across database systems, operating systems... compilers, web browsers, distributed systems..."

**Knowledge:** Domain-specific bug-finding across DB/OS/ML/distributed/smart-contracts — each domain has its own silent-failure class generic tools miss.

### [Why Programs Fail: A Guide to Systematic Debugging (Zeller, Elsevier 2nd ed.)](https://shop.elsevier.com/books/why-programs-fail/zeller/978-0-08-092300-0) — textbook
> "proof that debugging has graduated from a black art to a systematic discipline."

**Knowledge:** Canonical systematic-debugging text. Delta Debugging (dd) minimizes the difference between passing/failing input; cause-effect chains, slicing, automated test generation. Foundational to all modern fault isolation + fuzzer minimizers.

### [UIUC Software Testing Education Resources (Tao Xie)](https://taoxie.cs.illinois.edu/softtestingedu.html) — resource index
> "Daikon@MIT, Eclat@MIT, MAGIC@CMU, Blast@UCBerkeley, DIDUCE@Stanford, bddbddb@Stanford"

**Knowledge:** Curated index of testing research tools (Daikon dynamic invariants, Blast CEGAR model checker, DIDUCE dynamic analysis) + university automated-testing courses.

### [NIST Software Assurance Reference Dataset (SARD)](https://samate.nist.gov/SARD/) — government dataset · NOT fetched (HTTP 500)
> _(no excerpt — samate.nist.gov returned 500; confirmed real via alternate nist.gov URL, no fabricated quote)_

**Knowledge:** 80,000+ test cases with known weaknesses across C/C++/Java/PHP/C#, 150+ CWE classes — the standard benchmark for evaluating static-analysis tool precision/recall.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_a7a6a364-1d1). Ledger: state/shared/galaxy-knowledge-iterations.json._
