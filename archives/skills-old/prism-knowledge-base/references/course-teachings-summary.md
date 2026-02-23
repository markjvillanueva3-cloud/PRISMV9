# MIT Course Teachings - Quick Reference

## Course 6.005: Software Construction

### Reading 1: Static Checking
- **Types** prevent bugs at compile time
- **Static checking** catches errors before running
- Prefer static over dynamic checking

### Reading 2: Code Review Best Practices
- **DRY (Don't Repeat Yourself)** - extract common code
- **Comments where needed** - explain WHY, not WHAT
- **Fail fast** - check preconditions immediately
- **Avoid magic numbers** - use named constants
- **One purpose per variable** - don't reuse variables
- **Use good names** - clear, descriptive, conventional
- **Use whitespace** - formatting aids reading
- **Don't use global variables** - limit scope
- **Methods return results, don't print** - separation of concerns

### Reading 3: Testing
- **Test-first programming** - write tests before code
- **Partition inputs** - equivalence classes
- **Boundary testing** - edges of partitions
- **Blackbox vs Whitebox** - spec-based vs implementation-based
- **Document testing strategy** - explain your partitions
- **Unit testing** - test in isolation
- **Regression testing** - automate to catch regressions

### Reading 4: Specifications
- **Why specifications?** - contracts between caller and implementer
- **Behavioral equivalence** - same spec, different implementations
- **Preconditions** (REQUIRES) - what caller must provide
- **Postconditions** (EFFECTS) - what method guarantees
- **Spec strength** - stronger = more constraints, weaker = more freedom
- **Exceptions for bugs** - IllegalArgumentException, etc.
- **Exceptions for special results** - checked exceptions

### Reading 5: Avoiding Debugging
- **First defense: Make bugs impossible** - static typing, immutability
- **Second defense: Localize bugs** - fail fast, assertions
- **Assertions** - document and check invariants
- **Incremental development** - test as you go
- **Modularity** - small, independent pieces

### Reading 6: Mutability and Immutability
- **Immutable objects are safer** - no aliasing bugs
- **Mutable objects are risky** - shared references
- **Aliasing** - multiple references to same object
- **Defensive copying** - protect from external mutation
- **Iterating over mutable collections is dangerous**

### Reading 7: Abstract Data Types
- **Abstraction** - hide implementation details
- **Creator operations** - make new objects
- **Producer operations** - make new from old
- **Observer operations** - query state
- **Mutator operations** - change state
- **Rep independence** - implementation can change

### Reading 8: Rep Invariants and Abstraction Functions
- **Rep invariant (RI)** - what makes a valid representation
- **Abstraction function (AF)** - maps rep to abstract value
- **Check RI** - after every method that changes rep
- **Document AF and RI** - critical for maintainability
- **Rep exposure** - leaking mutable parts of rep

### Reading 9: Interfaces
- **Interfaces define types** - separate from implementation
- **Subtypes** - can substitute subtype for supertype
- **Program to interfaces** - not implementations
- **Generic interfaces** - reusable across types

### Reading 10: Equality
- **== vs equals()** - reference vs value equality
- **equals() contract** - reflexive, symmetric, transitive
- **hashCode() contract** - equal objects have equal hash codes
- **Mutable objects** - only use reference equality

### Reading 11: Concurrency
- **Threads share memory** - coordination needed
- **Race conditions** - timing-dependent bugs
- **Thread safety strategies:**
  1. **Confinement** - don't share
  2. **Immutability** - no mutation
  3. **Thread-safe data types** - synchronized collections
  4. **Synchronization** - locks

### Reading 12: Thread Safety
- **Confinement** - each thread has its own data
- **Immutability** - immutable objects are thread-safe
- **Locks** - mutual exclusion
- **Deadlock** - circular wait
- **Safety argument** - document why code is thread-safe

---

## Course 6.033: Computer System Engineering

### Key Principles
- **Modularity** - divide into independent parts
- **Abstraction** - hide complexity behind interface
- **Layering** - build on abstractions
- **Hierarchy** - organize layers
- **Naming** - unique identifiers
- **Binding** - map names to objects
- **Indirection** - flexibility through indirection

### Fault Tolerance
- **Redundancy** - multiple copies
- **Recovery** - restore to good state
- **Logging** - record operations
- **Checkpointing** - save state periodically
- **Replication** - multiple servers
- **Consensus** - agreement among replicas

### Performance
- **Caching** - keep frequently used data nearby
- **Batching** - group operations
- **Pipelining** - overlap operations
- **Parallelism** - do multiple things at once
- **Speculation** - guess and verify

---

## Course 6.046J: Algorithms

### Algorithm Design Paradigms
- **Divide and Conquer** - split, solve, combine
- **Dynamic Programming** - optimal substructure + overlapping subproblems
- **Greedy** - local optimal leads to global optimal
- **Randomization** - use random choices

### Complexity Classes
- **P** - polynomial time
- **NP** - verifiable in polynomial time
- **NP-complete** - hardest problems in NP
- **NP-hard** - at least as hard as NP-complete

### Common Algorithm Complexities
- O(1) - constant - hash lookup
- O(log n) - logarithmic - binary search
- O(n) - linear - linear search
- O(n log n) - linearithmic - merge sort
- O(n²) - quadratic - bubble sort
- O(2ⁿ) - exponential - subset enumeration

---

## Course 6.867: Machine Learning

### Learning Types
- **Supervised** - labeled examples
- **Unsupervised** - find structure in unlabeled data
- **Reinforcement** - learn from rewards

### Key Concepts
- **Bias-variance tradeoff** - complexity vs generalization
- **Overfitting** - memorizing training data
- **Regularization** - penalize complexity
- **Cross-validation** - estimate generalization
- **Feature engineering** - create good inputs

### Model Selection
- Start simple, add complexity as needed
- Validate on held-out data
- Consider interpretability needs
- Quantify uncertainty

---

## Course 2.810: Manufacturing Processes

### Cutting Mechanics
- **Kienzle equation**: F = kc × b × h^(1-mc)
- **Taylor tool life**: V × T^n = C
- **Specific cutting force** depends on material, geometry

### Key Parameters
- **Cutting speed** (V) - surface speed
- **Feed** (f) - advance per revolution
- **Depth of cut** (d) - engagement
- **Chip load** - material removed per tooth

### Optimization Constraints
- Machine power limits
- Tool strength limits
- Surface finish requirements
- Vibration/chatter limits
- Tool life economics

---

## Course 16.400: Human Factors

### UI Design Principles
- **Match user's mental model** - design for how users think
- **Provide feedback** - acknowledge every action
- **Prevent errors** - design out mistakes
- **Allow recovery** - easy undo
- **Reduce cognitive load** - progressive disclosure

### Error Message Guidelines
- Say what went wrong (specifically)
- Say why it matters
- Say how to fix it
- Use plain language
- Don't blame the user

### Response Time Guidelines
- < 100ms: feels instantaneous
- 100-1000ms: show activity
- > 1s: show progress
- > 10s: allow cancellation

---

## Summary: The Big Ideas

1. **Abstraction** - hide complexity (6.001, 6.005, 6.033)
2. **Modularity** - small, focused components (6.005, 6.033)
3. **Specification** - contracts and invariants (6.005)
4. **Testing** - verify behavior (6.005)
5. **Immutability** - safer than mutation (6.005)
6. **Fail fast** - catch errors early (6.005)
7. **Complexity analysis** - understand performance (6.046J)
8. **Validation** - generalization matters (6.867)
9. **Physics-based models** - domain knowledge (2.810)
10. **User-centered design** - design for humans (16.400)
