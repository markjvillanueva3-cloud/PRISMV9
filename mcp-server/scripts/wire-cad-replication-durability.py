#!/usr/bin/env python3
"""Wire CADReplicationDurabilityEngine to cadAutomationDispatcher - U-CUC53"""

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'rb') as f:
    raw = f.read()

# New action strings (7 replication durability actions)
new_actions = '''  "cad_replication_set_target",
  "cad_replication_register_replica",
  "cad_replication_register_shard",
  "cad_replication_mark_replica_lost",
  "cad_replication_mark_shard_lost",
  "cad_replication_get",
  "cad_replication_merge",
'''

# Find last action before ] as const
old_actions_end = b'"cad_physics_gate_reset_stats",\r\n] as const;'
new_actions_end = b'"cad_physics_gate_reset_stats",\r\n' + new_actions.replace('\n', '\r\n').encode() + b'] as const;'
raw = raw.replace(old_actions_end, new_actions_end, 1)

if b'cad_replication_set_target' not in raw:
    print('ERROR: Action string insertion failed')
    exit(1)

# Case statements - singleton cadReplicationDurabilityEngine
case_code = '''          case "cad_replication_set_target": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const target = params["target"] as Parameters<typeof cadReplicationDurabilityEngine.setTarget>[0];
            if (!target) {
              throw new Error("cad_replication_set_target requires 'target'");
            }
            cadReplicationDurabilityEngine.setTarget(target);
            result = { set: true, source: "CADReplicationDurabilityEngine.setTarget" };
            break;
          }
          case "cad_replication_register_replica": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const tier = params["tier"] as string;
            const region = params["region"] as string;
            const sizeBytes = params["size_bytes"] as number;
            if (!contentHash || !tier || !region || sizeBytes === undefined) {
              throw new Error("cad_replication_register_replica requires 'content_hash', 'tier', 'region', 'size_bytes'");
            }
            const record = cadReplicationDurabilityEngine.registerReplica(contentHash, tier, region, sizeBytes);
            result = { record, source: "CADReplicationDurabilityEngine.registerReplica" };
            break;
          }
          case "cad_replication_register_shard": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const shardIndex = params["shard_index"] as number;
            const totalShards = params["total_shards"] as number;
            const region = params["region"] as string;
            if (!contentHash || shardIndex === undefined || totalShards === undefined || !region) {
              throw new Error("cad_replication_register_shard requires 'content_hash', 'shard_index', 'total_shards', 'region'");
            }
            const record = cadReplicationDurabilityEngine.registerShard(contentHash, shardIndex, totalShards, region);
            result = { record, source: "CADReplicationDurabilityEngine.registerShard" };
            break;
          }
          case "cad_replication_mark_replica_lost": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const tier = params["tier"] as string;
            const region = params["region"] as string;
            if (!contentHash || !tier || !region) {
              throw new Error("cad_replication_mark_replica_lost requires 'content_hash', 'tier', 'region'");
            }
            const record = cadReplicationDurabilityEngine.markReplicaLost(contentHash, tier, region);
            result = { record, source: "CADReplicationDurabilityEngine.markReplicaLost" };
            break;
          }
          case "cad_replication_mark_shard_lost": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const shardIndex = params["shard_index"] as number;
            if (!contentHash || shardIndex === undefined) {
              throw new Error("cad_replication_mark_shard_lost requires 'content_hash', 'shard_index'");
            }
            const record = cadReplicationDurabilityEngine.markShardLost(contentHash, shardIndex);
            result = { record, source: "CADReplicationDurabilityEngine.markShardLost" };
            break;
          }
          case "cad_replication_get": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_replication_get requires 'content_hash'");
            }
            const record = cadReplicationDurabilityEngine.get(contentHash);
            result = { record: record ?? null, found: !!record, source: "CADReplicationDurabilityEngine.get" };
            break;
          }
          case "cad_replication_merge": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const remote = params["remote"] as Parameters<typeof cadReplicationDurabilityEngine.merge>[0];
            if (!remote) {
              throw new Error("cad_replication_merge requires 'remote' (ReplicationRecord)");
            }
            const merged = cadReplicationDurabilityEngine.merge(remote);
            result = { merged, source: "CADReplicationDurabilityEngine.merge" };
            break;
          }
'''

# Insert before the default case
old_default = b'          default:\r\n            result = { error: `Unknown action: ${action as string}` };'
new_default = case_code.replace('\n', '\r\n').encode() + old_default
raw = raw.replace(old_default, new_default, 1)

if b'case "cad_replication_set_target"' not in raw:
    print('ERROR: Case statement insertion failed')
    exit(1)

with open('src/tools/dispatchers/cadAutomationDispatcher.ts', 'wb') as f:
    f.write(raw)

print('CADReplicationDurabilityEngine wired successfully (7 actions)')
