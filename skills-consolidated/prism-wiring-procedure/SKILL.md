---
name: prism-wiring-procedure
description: Step-by-step procedure for wiring databases to consumers through PRISM Gateway — register database, register consumers, register routes, verify utilization
---
# Database-to-Consumer Wiring Procedure

## When To Use
- Building a new PRISM database module (materials, machines, tools, etc.)
- Adding a new consumer (calculator, engine, validator) that needs data access
- "How do I wire this database to its consumers?" / "How do I connect to a data source?"
- During R1+ when building data infrastructure — this is the procedure for every new data module
- NOT for: verifying existing wiring is correct (use prism-wiring-verification)
- NOT for: deciding which agent to assign the task to (use prism-agent-selection)

## How To Use
**EXECUTE THESE 5 STEPS IN ORDER when adding a new database or consumer:**

**STEP 1 — REGISTER THE DATABASE:**
  Create the database module with required _meta block:
  ```typescript
  const MY_DATABASE = {
    _meta: { id: 'PRISM_MY_DATABASE', version: '1.0.0', category: 'materials|machines|tools', layer: 'CORE|ENHANCED' },
    _consumers: ['CONSUMER_A', 'CONSUMER_B', ...],  // list ALL known consumers
    _fields: { fieldName: { type: 'number', unit: 'MPa', consumers: ['CONSUMER_A'] } },
    _routes: { 'get-by-id': { method: 'GET', handler: 'getById' }, 'query': { method: 'GET', handler: 'query' } }
  };
  PRISM_GATEWAY.registerDatabase(MY_DATABASE);
  ```
  Rule: every field MUST list its consumers. Zero-consumer fields = remove or add consumer.

**STEP 2 — REGISTER EACH CONSUMER:**
  Consumer declares dataSources in _meta, connects via Gateway in init(), tracks _sources in output:
  ```typescript
  const MY_CONSUMER = {
    _meta: { id: 'MY_CONSUMER', dataSources: ['PRISM_MY_DATABASE', 'PRISM_OTHER_DB'] },
    init() { this.myData = PRISM_GATEWAY.connect('my_database'); },
    calculate(params) {
      const data = this.myData.get(params.id);
      return { result: compute(data), _sources: { my_database: data._version } };
    }
  };
  PRISM_GATEWAY.registerConsumer(MY_CONSUMER);
  ```

**STEP 3 — REGISTER GATEWAY ROUTES:**
  Map URL-style routes to database handlers:
  ```typescript
  PRISM_GATEWAY.registerRoute('my_database/get-by-id', { handler: MY_DATABASE.getById, auth: 'read' });
  PRISM_GATEWAY.registerRoute('my_database/query', { handler: MY_DATABASE.query, auth: 'read' });
  ```
  All data access goes through Gateway. Direct database access is PROHIBITED.

**STEP 4 — WIRE EVENT SUBSCRIPTIONS (if real-time needed):**
  ```typescript
  PRISM_EVENT_WIRING.subscribe('material:updated', 'MY_CONSUMER', (payload) => { recalculate(payload.id); });
  ```
  Only needed for consumers that must react to data changes in real-time.

**STEP 5 — VERIFY WIRING:**
  Run utilization verifier to confirm minimum consumer counts:
  ```typescript
  PRISM_UTILIZATION_VERIFIER.verifyDatabase('PRISM_MY_DATABASE');
  // Must meet minimums: materials=15, machines=12, tools=10, workholding=8, other=6, lookups=4
  ```
  If verification fails: add more consumers or justify the lower count.

**MINIMUM CONSUMER REQUIREMENTS:**
  Materials: 15 | Machines: 12 | Tools: 10 | Workholding: 8 | Post-processors: 8 | Physics engines: 6 | AI/ML: 4 | Lookups: 4

## What It Returns
- A fully wired database accessible through PRISM_GATEWAY with registered consumers
- Every field has documented consumers, every consumer has documented sources
- Gateway routes enable data access without direct database coupling
- Utilization verification passes at build time
- _sources tracking in every consumer output for provenance

## Examples
- Input: "Adding a new workholding database with clamp force data"
  Step 1: Register PRISM_WORKHOLDING_DATABASE with _meta, _fields (clampForce, maxTorque, etc.), min 8 consumers
  Step 2: Register consumers: SafetyValidator (checks clamp vs cutting force), SetupOptimizer (recommends fixtures), CycleTimeCalc (includes setup time), plus 5 more
  Step 3: Register routes: workholding/get-by-id, workholding/query-by-machine, workholding/force-requirements
  Step 5: Verify: 8/8 consumers registered. All fields have at least 1 consumer. PASS.

- Input: "Adding a new consumer that calculates thermal effects using material + machine data"
  Step 2 only (databases already exist): Register THERMAL_CALCULATOR with dataSources=['PRISM_MATERIALS_MASTER', 'PRISM_MACHINES_DATABASE']
  Connect through Gateway in init(). Calculate thermal expansion using both sources. Return result with _sources.
  Update both source databases' _consumers lists to include THERMAL_CALCULATOR.

- Edge case: "Database has a field that no consumer uses"
  Utilization verifier flags: fieldName has 0 consumers.
  Decision: either add a consumer that uses it, or remove the field entirely.
  Zero-consumer fields are wasted storage and violate Commandment 1 (if it exists, use it everywhere).
SOURCE: Split from prism-wiring-templates (15.2KB)
RELATED: prism-wiring-verification
