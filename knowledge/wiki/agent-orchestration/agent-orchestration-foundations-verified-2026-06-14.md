---
name: agent-orchestration-foundations-verified-2026-06-14
description: VERIFIED (WebFetch-confirmed) deep-research foundations layer for the agent-orchestration galaxy (multi-agent orchestration, routing, coordination, consensus). 7 fetched + 1 honestly-unfetched source. Quality tier of FLEET-KNOWLEDGE-MAX (slot:zulu, 2026-06-14).
metadata:
  node_type: wiki
  type: architecture
  galaxy: agent-orchestration
  tier: VERIFIED
  verifiedBy: WebFetch
---

# agent-orchestration galaxy — verified foundations layer (2026-06-14)

> **VERIFIED tier** of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, slot:zulu). Sources marked fetched were WebFetched + excerpted; the Olfati-Saber 2007 consensus paper is honestly marked **unfetched** (cited by real DOI, no fabricated excerpt — R12). Directly relevant to PRISM's own 26-slot fleet + zulu orchestrator.

## Synthesis (next-layer knowledge)
Agent-orchestration research in 2024-2026 converged on three interlocking advances: (1) **routing is dynamic, confidence-aware, state-dependent** assignment across a heterogeneous model pool — unified frameworks (MoMA) treat LLM routing and agent selection as one problem; OI-MAS reports up to 12.88% accuracy gain + 79.78% cost reduction via per-turn confidence routing (directly validating PRISM's Ollama→Sonnet→Opus fallback ladder). (2) **Workflow execution moved from implicit loops to explicit scheduler-theoretic DAGs** (Structured Graph Harness) enforcing plan-version immutability and formal termination guarantees — addressing debugging opacity in production agent fleets (applicable to PRISM's slot-based autonomous /loop). (3) **Coordination topology and scale are measurable design variables** — AgentsNet shows frontier models degrade past ~20 agents; a 260-config empirical study finds hybrid orchestrator+peer architectures dominate, but coordination overhead grows faster than benefit once single-agent baselines are strong. The classical consensus theory (Olfati-Saber/Fax/Murray, Proc. IEEE 2007) — algebraic graph theory, directed information flow, robustness to topology switching — remains the mathematical substrate all modern LLM coordination protocols inherit.

## Verified sources

### [Orchestrating Intelligence: Confidence-Aware Routing for Multi-Agent Collaboration (OI-MAS)](https://arxiv.org/abs/2601.04861) — paper
> "multi-agent systems (MAS) have demonstrated superior performance over single-agent approaches in complex reasoning tasks, they often suffer from significant computational inefficiencies"

**Knowledge:** Per-turn confidence-aware routing across a heterogeneous multi-scale LLM pool → up to 12.88% accuracy gain, 79.78% cost reduction. Principle: model selection must be a dynamic, state-dependent decision, not a fixed assignment.

### [Towards Generalized Routing: Model and Agent Orchestration (MoMA)](https://arxiv.org/abs/2509.07571) — paper
> "dynamically routes queries to the LLM with the best cost-performance efficiency using intent recognition and adaptive routing strategies"

**Knowledge:** Unifies LLM routing and agent selection under one framework via a context-aware state machine with dynamic masking. Routing must account for both model capability and runtime context to balance cost vs performance.

### [From Agent Loops to Structured Graphs: A Scheduler-Theoretic Framework (SGH)](https://arxiv.org/abs/2604.11378) — paper
> "implicit dependencies between steps, unbounded recovery loops, and mutable execution history that complicates debugging"

**Knowledge:** Applies classical scheduling theory to LLM agents — converts implicit control flow into an explicit static DAG with formal termination guarantees (analyzed 70 systems). Directly applicable to PRISM's slot-based autonomous loop design.

### [From Static Templates to Dynamic Runtime Graphs: A Survey of Workflow Optimization for LLM Agents](https://arxiv.org/abs/2603.22386) — paper
> "we treat as agentic computation graphs (ACGs)... distinguishes static methods, which fix a reusable workflow scaffold before deployment, from dynamic methods"

**Knowledge:** Taxonomy of agentic workflow optimization: static scaffolds vs dynamic runtime graph adaptation. Establishes agentic computation graphs (ACGs) as the canonical abstraction for LLM workflow design.

### [Towards a Science of Scaling Agent Systems](https://arxiv.org/abs/2512.08296) — paper
> "four Multi-Agent: Independent, Centralized, Decentralized, Hybrid architectures... coordination yields diminishing returns once single-agent baselines exceed certain performance"

**Knowledge:** 260 configurations across six benchmarks, five architectural patterns. Scaling laws: hybrid orchestrator+peer architectures offer best trade-offs; coordination overhead grows faster than benefit at high single-agent performance.

### [MetaGPT: Meta Programming for A Multi-Agent Collaborative Framework (ICLR 2024)](https://arxiv.org/abs/2308.00352) — paper
> "MetaGPT encodes Standardized Operating Procedures (SOPs) into prompt sequences for more streamlined workflows, thus allowing agents... to verify intermediate results and reduce errors"

**Knowledge:** Encoding SOPs into multi-agent prompt sequences (assembly-line paradigm) suppresses cascading hallucinations; SOTA on HumanEval/MBPP. Human-workflow formalization is a coordination primitive.

### [AgentsNet: Coordination and Collaborative Reasoning in Multi-Agent LLMs](https://arxiv.org/abs/2507.08616) — paper
> "AgentsNet measures the ability of multi-agent systems to collaboratively form strategies for problem-solving, self-organization, and effective communication given a network topology"

**Knowledge:** Benchmark scaling to 100 agents — frontier LLMs degrade in coordination quality as network grows. Network topology is a first-class variable; self-organization is a measurable property.

### [Consensus and Cooperation in Networked Multi-Agent Systems — Olfati-Saber, Fax & Murray (Proc. IEEE 2007)](https://www.semanticscholar.org/paper/Consensus-and-Cooperation-in-Networked-Multi-Agent-Olfati-Saber-Fax/aa6be519b394b44ab24c6ad964f8a2c6a9b23571) — paper · NOT fetched
> _(no excerpt — not fetched; cited by DOI 10.1109/JPROC.2006.887293, no fabricated quote)_

**Knowledge:** Foundational IEEE paper (95(1):215-233) establishing the theoretical framework for consensus algorithms in networked multi-agent systems via algebraic graph theory, directed information flow, and robustness to topology/time-delay changes — the mathematical substrate underlying modern agent coordination.

---
_VERIFIED-research tier of FLEET-KNOWLEDGE-MAX (U-ZKM-VERIFY, run wf_20f6fbb7-a7e). Ledger: state/shared/galaxy-knowledge-iterations.json._
