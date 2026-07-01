---
name: prism-knowledge-base
description: |
  Comprehensive MIT/Stanford course knowledge base (220+ courses) for PRISM development. Use this skill when: (1) Starting any new feature, (2) Making design decisions, (3) Selecting algorithms, (4) Implementing AI/ML features, (5) Debugging complex issues, (6) Optimizing performance, (7) Writing clean code, (8) Designing UI/UX. Covers: coding best practices (6.001, 6.005), system design (6.033), algorithms (6.046J), machine learning (6.867), manufacturing (2.810, 2.852), optimization (6.079, 15.060), and much more.
---

## Quick Reference (Operational)

### When To Use
- Trigger keywords: "knowledge", "base", "comprehensive", "stanford", "course", "courses", "development"
- Quality gate check, anti-regression validation, or release readiness assessment.

### How To Use
1. Load skill: `prism_skill_script→skill_content(id="prism-knowledge-base")`
2. Apply relevant knowledge to current task context
3. Cross-reference with related dispatchers:
   - prism_validate→[relevant_action] for validation checks
   - prism_omega→compute for quality scoring
   - prism_ralph→loop for full validation cycle

### What It Returns
- **Format**: Structured markdown reference with formulas, tables, and decision criteria
- **Location**: Loaded into context via skill_content (not a file output)
- **Success**: Reference knowledge applicable to current task
- **Failure**: Content not found → verify skill exists in index

### Examples
**Example 1**: User asks about knowledge
→ Load skill: skill_content("prism-knowledge-base") → Apply relevant knowledge → Provide structured response

**Example 2**: Task requires base guidance
→ Load skill → Extract applicable section → Cross-reference with related skills → Deliver recommendation

# PRISM Knowledge Base Skill

## Purpose
**Comprehensive reference for Claude** covering the ENTIRE development process. 220+ MIT/Stanford courses provide knowledge for:
- Writing better code
- Designing robust systems
- Optimizing performance
- Validating correctness
- Building great UIs
- Managing complexity
- And much more...

**Use this skill CONSTANTLY throughout development!**
## Quick Lookup: What Are You Working On?

### CODING & IMPLEMENTATION
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Writing clean code | 6.001, 6.005 | Abstraction, modularity, SOLID principles |
| Debugging | 6.005, 6.820 | Testing strategies, assertions, invariants |
| Performance optimization | 6.172, 6.046J | Profiling, algorithmic complexity, caching |
| Memory management | 6.s096, 6.172 | Allocation, garbage collection, pooling |
| Concurrency | 6.005, 6.827 | Threads, locks, async patterns |
| Error handling | 6.005, 6.033 | Exceptions, recovery, fault tolerance |
| Code review | 6.005, 16.355J | Best practices, common pitfalls |

### SYSTEM DESIGN & ARCHITECTURE
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Module design | 6.033, 16.842 | Separation of concerns, interfaces |
| API design | 6.005, 6.033 | Contracts, versioning, documentation |
| Database design | 6.830, 6.033 | Normalization, indexing, transactions |
| Scaling | 6.033, 6.824 | Load balancing, caching, sharding |
| State management | 6.033, 6.005 | Immutability, event sourcing |
| Error recovery | 6.033, 6.858 | Checkpointing, rollback, logging |

### ALGORITHMS & DATA STRUCTURES
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Algorithm selection | 6.046J, 6.006 | Complexity analysis, trade-offs |
| Data structure choice | 6.006, 6.851 | Trees, graphs, hash tables |
| Graph problems | 6.046J, 15.082J | Shortest path, flow, matching |
| String/text processing | 6.006, 6.864 | Pattern matching, parsing |
| Geometric algorithms | 6.838, 6.837 | Convex hull, intersection, spatial |

### AI & MACHINE LEARNING
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Model selection | 6.867, 9.520 | Bias-variance, cross-validation |
| Feature engineering | 6.867, 15.097 | Normalization, encoding, selection |
| Neural networks | 6.867, 9.520 | Architecture, training, regularization |
| Uncertainty | 6.041, 6.867 | Bayesian methods, confidence intervals |
| Recommendation | 6.867, 15.097 | Collaborative filtering, bandits |
| Anomaly detection | 6.867, 6.041 | Outliers, one-class classification |

### OPTIMIZATION
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Linear optimization | 6.251J, 15.060 | Simplex, interior point |
| Nonlinear optimization | 6.252J, 6.079 | Gradient descent, Newton methods |
| Constrained optimization | 6.079, 15.084J | KKT conditions, Lagrangian |
| Multi-objective | 15.083J, 6.046J | Pareto fronts, weighted sums |
| Combinatorial | 15.083J, 6.046J | Branch & bound, approximation |
| Metaheuristics | 6.046J, 15.097 | GA, PSO, simulated annealing |

### MANUFACTURING & PHYSICS
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Cutting mechanics | 2.810, 2.003 | Force models, chip formation |
| Thermal analysis | 2.51, 2.55 | Heat transfer, FEM |
| Vibration/dynamics | 2.032, 6.011 | Modal analysis, stability |
| Tool life | 2.810, 6.867 | Taylor equation, wear models |
| Process planning | 2.810, 2.854 | Sequencing, setup optimization |
| Quality control | 2.830, 6.041 | SPC, hypothesis testing |

### USER INTERFACE & EXPERIENCE
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| UI design | 16.400, 6.813 | Human factors, usability |
| Visualization | 6.837, 6.859 | Charts, 3D graphics, interaction |
| Accessibility | 16.400 | Universal design, WCAG |
| Error messages | 6.005, 16.400 | Clarity, actionability |
| Performance perception | 16.400, 6.172 | Progress indicators, responsiveness |

### SECURITY & RELIABILITY
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Input validation | 6.858, 6.005 | Sanitization, injection prevention |
| Authentication | 6.857, 6.858 | Passwords, tokens, OAuth |
| Data protection | 6.857 | Encryption, hashing |
| Fault tolerance | 6.033, 6.824 | Replication, consensus |
| Audit logging | 6.033, 6.858 | Traceability, compliance |

### BUSINESS & OPERATIONS
| Task | Relevant Courses | Key Concepts |
|------|-----------------|--------------|
| Cost estimation | 2.810, 15.060 | Activity-based costing, regression |
| Scheduling | 2.854, 15.083J | Job shop, dispatching rules |
| Inventory | 15.060, 2.854 | EOQ, safety stock, MRP |
| Queuing analysis | 2.852, 15.060 | Utilization, wait times |
| Financial models | 15.401, 15.060 | NPV, risk analysis |
## Essential Courses (TIER 1)

### 6.001 - SICP (Programming Fundamentals)
- Abstraction and modularity
- Recursion and iteration
- Higher-order functions
- Data abstraction
- State and mutation

### 6.005 - Software Construction
- Specifications and contracts
- Testing strategies (unit, integration)
- Debugging techniques
- Concurrency patterns
- Code review practices

### 6.033 - Computer System Engineering
- Modularity and abstraction
- Naming and binding
- Client-server architecture
- Fault tolerance
- Performance engineering

### 6.046J - Design and Analysis of Algorithms
- Divide and conquer
- Dynamic programming
- Graph algorithms
- Approximation algorithms
- Complexity analysis

### 6.867 - Machine Learning
- Supervised learning
- Neural networks
- Bayesian methods
- Model selection
- Regularization

### 2.810 - Manufacturing Processes
- Cutting mechanics
- Process selection
- Cost estimation
- Design for manufacturing
## Quick Reference Cards

### For CLEAN CODE (6.005)
- Write specs BEFORE implementation
- Use immutable data when possible
- Fail fast with clear error messages
- Test at boundaries and edge cases
- Document public interfaces

### For PERFORMANCE (6.046J)
- Know your algorithm's complexity
- Profile before optimizing
- Consider space-time trade-offs
- Cache expensive computations
- Use appropriate data structures

### For SYSTEMS (6.033)
- Design for failure
- Use modularity to limit damage
- Log enough to debug
- Consider the end-to-end argument
- Separate policy from mechanism

### For ML FEATURES (6.867)
- Start simple, add complexity as needed
- Validate on held-out data
- Regularize to prevent overfitting
- Quantify uncertainty
- Monitor for distribution shift

### For UI/UX (16.400)
- Design for the user's mental model
- Provide feedback for all actions
- Make errors recoverable
- Reduce cognitive load
- Test with real users
## Course Material Location

```
C:\\PRISM\MIT COURSES\
├── MIT COURSES 5\FULL FILES\   ← 90+ courses (MAIN)
│   ├── 6.001-spring-2005.zip   ← SICP
│   ├── 6.005-spring-2016.zip   ← Software Construction
│   ├── 6.033-spring-2018.zip   ← Computer Systems
│   └── [many more...]
└── UPLOADED\                   ← Additional courses
```
## Reference Files

| File | Contents |
|------|----------|
| course-inventory.md | Complete 220+ course inventory with priorities |
| development-patterns.md | Coding patterns, algorithm selection, implementation guides |
| problem-solution-lookup.md | Problem → Course → Solution mapping |
| algorithm-engine-mapping.md | Academic algorithms → PRISM engines |
| coding-patterns.md | Design patterns with PRISM examples |
| data-structures.md | Data structure selection guide |
