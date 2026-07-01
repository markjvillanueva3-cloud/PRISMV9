# /erp-sync — ERP System Synchronization

Synchronize PRISM data with ERP systems for bidirectional updates.

## Usage
```
/erp-sync [--system <erp_name>] [--direction in|out|both] [--entities <list>]
```

## Workflow

1. **Connection Setup**
   - Connect to ERP system
   - Authenticate credentials
   - Verify API access
   - Check sync status

2. **Entity Mapping**
   - Jobs and work orders
   - Parts and BOMs
   - Operations and routing
   - Inventory and stock

3. **Data Synchronization**
   - Pull ERP data to PRISM
   - Push PRISM updates to ERP
   - Conflict resolution
   - Transaction logging

4. **Variability Data**
   - **Sync VariabilityEnvelopeEngine data for costing**
   - Push actual cycle times
   - Update standard costs
   - Feed process capability

5. **Validation**
   - Data integrity checks
   - Sync status report
   - Error handling
   - Retry failed syncs

## Supported Systems
- SAP B1
- Epicor
- JobBOSS
- E2 Shop System
- IQMS
- Custom REST APIs

## Engines Used
- ERPSyncEngine
- DataMappingEngine
- VariabilityEnvelopeEngine (Phase 0.25)
- TransactionLogEngine

## Example
```
/erp-sync --system e2 --direction both --entities jobs,parts
```
