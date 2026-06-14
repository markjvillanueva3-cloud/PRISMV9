---
title: Token-Optimization Foundations — Information Theory, Compression & Context Economy
galaxy: token-optimization
owner_slot: alpha
status: VERIFIED-PARTIAL
verified_by: "papa-meta-create-workflow (2026-06-10)"
verification_method: "Each themed section below maps to a claim confirmed by a live WebFetch against a free/legal academic or reference source (MIT OpenCourseWare, Wikipedia information-theory corpus). No claim appears here that was not fetched and read. Engineering-relevance lines link the theory to how the token-optimization galaxy applies it; those mappings are PRISM-internal and are NOT claimed to be in the cited sources."
tags: [token-optimization, information-theory, entropy, compression, source-coding, channel-capacity, context-economy, shannon, kraft, kolmogorov, kl-divergence, foundations]
---

# Token-Optimization Foundations

The token-optimization galaxy (owner: alpha) exists to move the maximum amount of *useful signal* through a bounded context window at minimum *token cost* — RTK output filtering, Ollama offload routing, digest-over-exploration, keyword-gated hook injection, and load-on-demand skills are all engineering expressions of one body of theory: **information theory and source coding**, founded by Claude Shannon in 1948. This page grounds the galaxy's practice in the free academic literature on entropy, compression, and channel capacity, and maps each result to how PRISM spends and saves tokens.

This is a foundations entry: it establishes the *why* underneath the galaxy's tools. Operational counts, dispatcher actions, and engine inventories live in `PRISM-INVENTORY-LATEST.md` and the galaxy `MEMORY.md` — not here.

---

## 1. Information content and the bit (the unit we are optimizing)

The quantity a token-budget optimizes is *information*, and information has a unit. The **self-information** (information content) of an event E with probability p(E) is

```
I(E) = -log(p(E)) = log(1 / p(E))
```

so that rarer events carry more information ("surprise"). When the logarithm is taken in base 2, the unit is the **bit** — Shannon's 1948 paper introduced the term explicitly: *"If the base 2 is used the resulting units may be called binary digits, or more briefly bits"* (crediting J. W. Tukey). MIT 6.050J *Information and Entropy* (OCW, Spring 2008) frames the entire course around *"the ultimate limits to communication and computation, with an emphasis on the physical nature of information and information processing,"* teaching bits, codes, and compression as its first units.

**Engineering relevance:** a token is the galaxy's practical "symbol"; minimizing tokens is minimizing the bit-cost of carrying a fixed amount of task-relevant information. A low-probability (high-surprise) datum — a specific file:line, a reference value — is worth its tokens; a high-probability (predictable) datum — boilerplate, restated context — is cheap signal we route out via RTK / digests.

## 2. Entropy is the floor — the source coding theorem

The **Shannon entropy** of a source X is the expected self-information:

```
H(X) = -Σ p(x) log p(x)        (bits, when log base 2; also called "shannons")
```

It *"quantifies the average level of uncertainty or information associated with the variable's potential states."* Shannon's **source coding theorem** turns this into a hard limit on lossless compression: N i.i.d. symbols of entropy H(X) *can* be compressed into slightly more than N·H(X) bits with negligible loss as N → ∞, but compressing into *fewer* than N·H(X) bits *"virtually certain[ly]"* loses information. For an optimal symbol code over an alphabet of size a, the expected codeword length E[S] is bounded:

```
H(X)/log2(a)  ≤  E[S]  <  H(X)/log2(a) + 1
```

**Engineering relevance:** there is a real, theory-defined floor to how few tokens can carry a given task's information — you cannot losslessly squeeze a context below its entropy. This is why the galaxy distinguishes *lossless* token reduction (RTK reformatting, dedup, shortcodes — same information, fewer tokens) from *lossy* reduction (summarization, dropping detail). Below the entropy floor, reduction is necessarily lossy.

## 3. Prefix codes, Kraft's budget, and why short codes are scarce

Lossless codes that are instantaneously decodable are **prefix codes**, and their codeword lengths obey the **Kraft–McMillan inequality**: for codeword lengths l_1..l_n over an r-symbol alphabet,

```
Σ r^(-l_i) ≤ 1        (binary: Σ 2^(-l_i) ≤ 1)
```

This is *"a budget": shorter codewords are 'expensive,' so you cannot have too many of them.* It is both necessary (any uniquely decodable code satisfies it) and sufficient (any lengths satisfying it admit a prefix code). **Huffman coding** realizes the optimum: a *"minimum-redundancy"* prefix code that assigns shorter codes to frequent symbols and lands *"only slightly larger than the calculated entropy"* (e.g. 2.25 bits/symbol against a 2.205-bit entropy in the canonical example).

**Engineering relevance:** the galaxy's DSL shortcodes (`E####`, `D##`, `A##`, `T####`) are a hand-built Huffman-style scheme — the most-referenced asset classes get the shortest tokens. Kraft is the reason you cannot make *everything* short: a short-token budget is conserved, so it must be spent on the highest-frequency / highest-value references.

## 4. Lossless vs. lossy — redundancy is what we delete

*"Lossless compression reduces bits by identifying and eliminating statistical redundancy. No information is lost."* *"Lossy compression reduces bits by removing unnecessary or less important information,"* trading fidelity for size **irreversibly** — *"this loss is permanent."* Both rest on redundancy: real data carries statistical patterns (the canonical "279 red pixels" run instead of 279 listings) that a compact encoding exploits.

**Engineering relevance:** this is the galaxy's safety line. RTK output filtering, byte-equal dedup, and shortcode substitution are **lossless** — they remove redundancy with exact recoverability, so they are always safe to apply. Ollama summarization, handoff compaction, and digest-over-exploration are **lossy** — they discard "less important" information and are *not* reversible, so they require judgment about what is task-critical (R12: never silently drop the edge case the user named). Knowing which class a technique is in is the precondition for applying it.

## 5. Relative entropy — the cost of a wrong model (KL divergence)

When you encode a true source P with a code built for the *wrong* distribution Q, you pay. The **Kullback–Leibler divergence** (relative entropy)

```
D_KL(P‖Q) = Σ P(x) log( P(x) / Q(x) )
```

is exactly *"the expected number of extra bits that must be transmitted to identify a value drawn from P, if a code optimized for Q rather than P is used."* It quantifies the *"wasted information when using an incorrect probabilistic model."*

**Engineering relevance:** a context window pre-loaded with the *wrong* priorities — generic boilerplate when the task is narrow, or the wrong galaxy's tribal tips — is a Q-coded P: every token spent on the mismatch is KL-wasted budget. This is the theory behind *keyword-gated, relevance-ranked* injection (master-index top-K, tribal-by-domain, wiki-precheck): align the injected distribution Q to the task's true distribution P and the extra-bit tax falls toward zero.

## 6. Channel capacity — the bound the *model* imposes

Shannon's **noisy-channel coding theorem** bounds reliable throughput: for any rate R below the **channel capacity C**, there exists a code transmitting at R with error probability below any ε > 0; above C, arbitrarily-low error is impossible. For the additive-white-Gaussian-noise channel the **Shannon–Hartley theorem** gives

```
C = B · log2(1 + S/N)
```

(B = bandwidth Hz, S = signal power, N = noise power, C in bits/s).

**Engineering relevance:** the LLM context window is the galaxy's channel, and it has a finite capacity. Past a usable fraction of the window, added tokens stop adding reliable signal (degraded recall / "lost-in-the-middle") — the practical analogue of pushing R above C. The galaxy's soft ceilings (~4k tokens/task, ~30k/session per R6) and the `/compact`-every-2-3-units cadence are operating the channel *below capacity* on purpose, where information is reliably recoverable rather than noisily dropped.

## 7. The ultimate limit — Kolmogorov complexity

Where entropy bounds compression of a *random source*, **Kolmogorov complexity** bounds compression of a *single object*: it is *"the length of a shortest computer program (in a predetermined programming language) that produces the object as output"* — the minimal description length. Crucially it is **not computable** (computing K(s) would solve the halting problem); only *upper bounds* are obtainable, "by compressing strings and measuring the resulting compressed size."

**Engineering relevance:** the most compressed form of "what this chat needs to know" is its shortest generating description — a digest, an index pointer, a `[[wikilink]]` — not the raw artifact. The non-computability result is a humility check: there is no algorithm that returns the *provably* minimal context, so the galaxy uses *practical upper bounds* (digests, shortcodes, handoffs) and measures their realized token cost rather than claiming optimality.

---

## Owner-gate (NOT promoted)

The following are deliberately left for alpha (galaxy owner) to verify before promotion beyond VERIFIED-PARTIAL:

- **MIT 6.050J specific formulas.** The OCW course-landing page confirmed the course's *scope* (bits, codes, compression, channel capacity, entropy↔thermodynamics) but did **not** expose the per-unit mathematical definitions (e.g. the unit-1/2 "Bits and Codes" derivations). The I(E) = -log p and H = -Σ p log p formulas above were confirmed from the Wikipedia information-theory corpus, **not** from the 6.050J unit pages. Alpha should fetch the open-textbook unit pages directly if a course-sourced citation is wanted.
- **Cover & Thomas concepts.** The DOMAIN named *Elements of Information Theory* (Cover & Thomas) as a grounding text; no legal free full-text was fetched, so no claim here is attributed to it. The entropy / source-coding / KL / channel-capacity results were sourced from open reference pages that cover the same material. Treat Cover & Thomas as an offline corroboration target, not a fetched source.
- **Quantitative PRISM thresholds.** The ~4k-tokens/task and ~30k-tokens/session ceilings cited in §6 come from PRISM's own R6 doctrine (CLAUDE.md), not from any information-theory source — they are operational policy, not a theorem. The Shannon–Hartley *form* is theory; the specific PRISM ceilings are not derived from it and must not be presented as such.
- **Engineering-relevance mappings.** Every "Engineering relevance" line is a PRISM-internal interpretation linking the theory to galaxy tooling (RTK, shortcodes, injection ranking, /compact cadence). These mappings are reasoned, not quoted from the sources, and are the appropriate place for owner scrutiny.

## Sources

All URLs below were fetched and read on 2026-06-10 (free / legal: MIT OpenCourseWare + Wikipedia information-theory corpus). Course/textbook/gov-grade source flagged.

1. MIT 6.050J *Information and Entropy*, OCW Spring 2008 — https://ocw.mit.edu/courses/6-050j-information-and-entropy-spring-2008/  **(free college course)**
2. Shannon's source coding theorem — https://en.wikipedia.org/wiki/Shannon%27s_source_coding_theorem
3. Entropy (information theory) — https://en.wikipedia.org/wiki/Entropy_(information_theory)
4. A Mathematical Theory of Communication (Shannon 1948) — https://en.wikipedia.org/wiki/A_Mathematical_Theory_of_Communication
5. Channel capacity / Shannon–Hartley — https://en.wikipedia.org/wiki/Channel_capacity
6. Huffman coding — https://en.wikipedia.org/wiki/Huffman_coding
7. Kraft–McMillan inequality — https://en.wikipedia.org/wiki/Kraft%E2%80%93McMillan_inequality
8. Kolmogorov complexity — https://en.wikipedia.org/wiki/Kolmogorov_complexity
9. Kullback–Leibler divergence — https://en.wikipedia.org/wiki/Kullback%E2%80%93Leibler_divergence
10. Data compression (lossless vs. lossy) — https://en.wikipedia.org/wiki/Data_compression
