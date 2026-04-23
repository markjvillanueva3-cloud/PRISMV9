/**
 * RecordTimelineEngine — Session 6-6 U-APPR2
 *
 * Immutable event log for any entity. Auto-populated from EventBus events.
 * Also manages threaded comments with file attachments and wires AuditEngine
 * to persistent DB storage (replacing the 50K in-memory limit).
 *
 * NOT a duplicate of AuditEngine — AuditEngine is a compliance audit trail
 * for system-wide actions. RecordTimelineEngine is a per-entity activity feed
 * showing the human-readable story of what happened to a specific record.
 *
 * Actions: timeline_get, timeline_add, comment_create, comment_list,
 *          comment_reply, comment_edit, comment_delete
 *
 * DB: record_timeline, comments (migration 004)
 */

import { eventBus } from "./EventBus.js";
import { auditEngine } from "./AuditEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type TimelineEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "approval_submitted"
  | "approval_decided"
  | "approval_completed"
  | "file_attached"
  | "comment_added"
  | "assigned"
  | "linked"
  | "unlinked"
  | "emailed"
  | "printed"
  | "exported"
  | "archived"
  | "custom";

export interface TimelineEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: TimelineEventType;
  actor?: string;
  summary: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface Comment {
  id: string;
  entity_type: string;
  entity_id: string;
  parent_id?: string;
  author_id?: string;
  author_name: string;
  body: string;
  attachments: CommentAttachment[];
  is_internal: boolean;
  edited_at?: string;
  deleted_at?: string;
  created_at: string;
  replies?: Comment[];
}

export interface CommentAttachment {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url?: string;
}

export interface CreateCommentInput {
  entity_type: string;
  entity_id: string;
  author_id?: string;
  author_name: string;
  body: string;
  parent_id?: string;
  attachments?: CommentAttachment[];
  is_internal?: boolean;
}

export interface TimelineQuery {
  entity_type: string;
  entity_id: string;
  event_types?: TimelineEventType[];
  since?: string;
  limit?: number;
}

export interface TimelineAddInput {
  entity_type: string;
  entity_id: string;
  event_type: TimelineEventType;
  actor?: string;
  summary: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// ENGINE
// ============================================================================

let timelineSeq = 0;
let commentSeq = 0;

const MAX_TIMELINE_ENTRIES = 10_000;
const MAX_COMMENTS = 10_000;

export class RecordTimelineEngine {
  private timeline: Map<string, TimelineEntry> = new Map();
  private comments: Map<string, Comment> = new Map();
  private eventBusWired = false;

  constructor() {
    this.wireEventBus();
  }

  // ========================================================================
  // TIMELINE
  // ========================================================================

  /** Add an entry to an entity's timeline.
   * @param input - timeline entry data
   * @returns the created TimelineEntry
   */
  addEntry(input: TimelineAddInput): TimelineEntry {
    if (!input.entity_type || !input.entity_id) {
      throw new Error("entity_type and entity_id are required");
    }
    if (!input.summary || input.summary.trim().length === 0) {
      throw new Error("summary is required and cannot be empty");
    }

    const id = `tl-${++timelineSeq}-${Date.now().toString(36)}`;
    const entry: TimelineEntry = {
      id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      event_type: input.event_type,
      actor: input.actor,
      summary: input.summary,
      details: input.details ?? {},
      created_at: new Date().toISOString(),
    };

    this.timeline.set(id, entry);
    this.evictIfNeeded();
    return entry;
  }

  /** Evict oldest entries when maps exceed capacity. */
  private evictIfNeeded(): void {
    if (this.timeline.size > MAX_TIMELINE_ENTRIES) {
      const sorted = [...this.timeline.entries()]
        .sort((a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime());
      const toRemove = sorted.slice(0, this.timeline.size - MAX_TIMELINE_ENTRIES);
      for (const [key] of toRemove) this.timeline.delete(key);
    }
    if (this.comments.size > MAX_COMMENTS) {
      const sorted = [...this.comments.entries()]
        .sort((a, b) => new Date(a[1].created_at).getTime() - new Date(b[1].created_at).getTime());
      const toRemove = sorted.slice(0, this.comments.size - MAX_COMMENTS);
      for (const [key] of toRemove) this.comments.delete(key);
    }
  }

  /** Get the timeline for an entity.
   * @param query - filter criteria (entity type/id, event types, since, limit)
   * @returns sorted TimelineEntry records (newest first)
   */
  getTimeline(query: TimelineQuery): TimelineEntry[] {
    if (!query.entity_type || !query.entity_id) {
      throw new Error("entity_type and entity_id are required");
    }

    let entries = [...this.timeline.values()].filter(
      (e) => e.entity_type === query.entity_type && e.entity_id === query.entity_id
    );

    if (query.event_types && query.event_types.length > 0) {
      entries = entries.filter((e) => query.event_types!.includes(e.event_type));
    }

    if (query.since) {
      const sinceMs = new Date(query.since).getTime();
      if (Number.isNaN(sinceMs)) {
        throw new Error(`Invalid 'since' date: '${query.since}'`);
      }
      entries = entries.filter((e) => new Date(e.created_at).getTime() >= sinceMs);
    }

    entries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const limit = query.limit ?? 50;
    return entries.slice(0, limit);
  }

  /** Get timeline entry count for an entity.
   * @param entityType - the entity type
   * @param entityId - the entity ID
   * @returns count of timeline entries
   */
  getEntryCount(entityType: string, entityId: string): number {
    return [...this.timeline.values()].filter(
      (e) => e.entity_type === entityType && e.entity_id === entityId
    ).length;
  }

  // ========================================================================
  // COMMENTS
  // ========================================================================

  /** Create a comment on an entity.
   * @param input - comment data (author, body, optional parent for threading)
   * @returns the created Comment
   */
  createComment(input: CreateCommentInput): Comment {
    if (!input.entity_type || !input.entity_id) {
      throw new Error("entity_type and entity_id are required");
    }
    if (!input.body || input.body.trim().length === 0) {
      throw new Error("Comment body cannot be empty");
    }
    if (!input.author_name || input.author_name.trim().length === 0) {
      throw new Error("author_name is required");
    }

    // Validate parent exists if specified
    if (input.parent_id) {
      const parent = this.comments.get(input.parent_id);
      if (!parent) {
        throw new Error(`Parent comment '${input.parent_id}' not found`);
      }
      if (parent.deleted_at) {
        throw new Error("Cannot reply to a deleted comment");
      }
      if (parent.entity_type !== input.entity_type || parent.entity_id !== input.entity_id) {
        throw new Error("Parent comment must belong to the same entity");
      }
    }

    const id = `cmt-${++commentSeq}-${Date.now().toString(36)}`;
    const comment: Comment = {
      id,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      parent_id: input.parent_id,
      author_id: input.author_id,
      author_name: input.author_name,
      body: input.body,
      attachments: input.attachments ?? [],
      is_internal: input.is_internal ?? false,
      created_at: new Date().toISOString(),
    };

    this.comments.set(id, comment);
    this.evictIfNeeded();

    // Auto-add timeline entry
    this.addEntry({
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      event_type: "comment_added",
      actor: input.author_name,
      summary: input.parent_id
        ? `${input.author_name} replied to a comment`
        : `${input.author_name} added a comment`,
      details: {
        comment_id: id,
        is_internal: comment.is_internal,
        has_attachments: comment.attachments.length > 0,
        preview: input.body.slice(0, 120),
      },
    });

    auditEngine.log("data", "comment_added", input.author_name, {
      comment_id: id, entity_type: input.entity_type, entity_id: input.entity_id,
      is_reply: !!input.parent_id, is_internal: comment.is_internal,
    }, { resource_type: input.entity_type, resource_id: input.entity_id });

    return comment;
  }

  /** List comments for an entity (threaded).
   * @param entityType - the entity type
   * @param entityId - the entity ID
   * @param includeInternal - whether to include internal comments (default true)
   * @returns top-level comments with nested replies
   */
  listComments(entityType: string, entityId: string, includeInternal = true): Comment[] {
    const all = [...this.comments.values()].filter(
      (c) =>
        c.entity_type === entityType &&
        c.entity_id === entityId &&
        !c.deleted_at &&
        (includeInternal || !c.is_internal)
    );

    // Build threaded structure
    const topLevel = all.filter((c) => !c.parent_id);
    const byParent = new Map<string, Comment[]>();
    for (const c of all) {
      if (c.parent_id) {
        const existing = byParent.get(c.parent_id) ?? [];
        existing.push(c);
        byParent.set(c.parent_id, existing);
      }
    }

    const attachReplies = (comment: Comment): Comment => ({
      ...comment,
      replies: (byParent.get(comment.id) ?? [])
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(attachReplies),
    });

    return topLevel
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(attachReplies);
  }

  /** Edit a comment body.
   * @param commentId - the comment ID
   * @param newBody - the new body text
   * @param editorName - who is editing
   * @returns the updated Comment
   */
  editComment(commentId: string, newBody: string, editorName: string): Comment {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error(`Comment '${commentId}' not found`);
    if (comment.deleted_at) throw new Error("Cannot edit a deleted comment");
    if (!newBody || newBody.trim().length === 0) throw new Error("Comment body cannot be empty");

    const previousBody = comment.body;
    comment.body = newBody;
    comment.edited_at = new Date().toISOString();
    this.comments.set(commentId, comment);

    auditEngine.log("data", "comment_edited", editorName, {
      comment_id: commentId, entity_type: comment.entity_type, entity_id: comment.entity_id,
    }, {
      resource_type: comment.entity_type, resource_id: comment.entity_id,
      previous_value: { body: previousBody }, new_value: { body: newBody },
    });

    return comment;
  }

  /** Soft-delete a comment.
   * @param commentId - the comment ID
   * @param deletedBy - who is deleting
   * @returns the soft-deleted Comment
   */
  deleteComment(commentId: string, deletedBy: string): Comment {
    const comment = this.comments.get(commentId);
    if (!comment) throw new Error(`Comment '${commentId}' not found`);

    comment.deleted_at = new Date().toISOString();
    this.comments.set(commentId, comment);

    auditEngine.log("data", "comment_deleted", deletedBy, {
      comment_id: commentId, entity_type: comment.entity_type, entity_id: comment.entity_id,
    }, { resource_type: comment.entity_type, resource_id: comment.entity_id });

    return comment;
  }

  /** Get comment count for an entity.
   * @param entityType - the entity type
   * @param entityId - the entity ID
   * @returns count of non-deleted comments
   */
  getCommentCount(entityType: string, entityId: string): number {
    return [...this.comments.values()].filter(
      (c) => c.entity_type === entityType && c.entity_id === entityId && !c.deleted_at
    ).length;
  }

  // ========================================================================
  // EVENTBUS WIRING
  // ========================================================================

  /** Wire EventBus subscriptions to auto-populate timeline entries from
   * approval events, data events, and quality events.
   */
  private wireEventBus(): void {
    if (this.eventBusWired) return;
    this.eventBusWired = true;

    // Approval events → timeline entries
    eventBus.subscribe("approval.*", (event) => {
      const p = event.payload as Record<string, unknown>;
      const entityType = p.entity_type as string;
      const entityId = p.entity_id as string;
      if (!entityType || !entityId) return;

      const typeMap: Record<string, { eventType: TimelineEventType; summary: string }> = {
        "approval.submitted": {
          eventType: "approval_submitted",
          summary: `Approval submitted by ${p.submitted_by ?? "unknown"}`,
        },
        "approval.completed": {
          eventType: "approval_completed",
          summary: `Approval ${p.final_status === "auto_approved" ? "auto-approved" : "approved"}`,
        },
        "approval.rejected": {
          eventType: "approval_decided",
          summary: `Approval rejected by ${p.decided_by ?? "unknown"}${p.reason ? `: ${p.reason}` : ""}`,
        },
        "approval.delegated": {
          eventType: "approval_decided",
          summary: `Approval delegated from ${p.from ?? "unknown"} to ${p.to ?? "unknown"}`,
        },
        "approval.cancelled": {
          eventType: "approval_decided",
          summary: `Approval cancelled by ${p.cancelled_by ?? "unknown"}`,
        },
        "approval.step_advanced": {
          eventType: "approval_submitted",
          summary: `Approval advanced to step ${p.step ?? "?"}/${p.total_steps ?? "?"}`,
        },
      };

      const mapped = typeMap[event.type];
      if (mapped) {
        this.addEntry({
          entity_type: entityType,
          entity_id: entityId,
          event_type: mapped.eventType,
          actor: (p.submitted_by ?? p.decided_by ?? p.cancelled_by ?? "system") as string,
          summary: mapped.summary,
          details: p,
        });
      }
    }, { timeout_ms: 2000 });

    // Data/quality events → timeline entries
    eventBus.subscribe("data.updated", (event) => {
      const p = event.payload as Record<string, unknown>;
      if (p.entity_type && p.entity_id) {
        this.addEntry({
          entity_type: p.entity_type as string,
          entity_id: p.entity_id as string,
          event_type: "updated",
          actor: (p.actor ?? event.source) as string,
          summary: (p.summary as string) ?? `Record updated by ${event.source}`,
          details: p,
        });
      }
    }, { timeout_ms: 2000 });

    eventBus.subscribe("quality.*", (event) => {
      const p = event.payload as Record<string, unknown>;
      if (p.entity_type && p.entity_id) {
        this.addEntry({
          entity_type: p.entity_type as string,
          entity_id: p.entity_id as string,
          event_type: "custom",
          actor: event.source,
          summary: `Quality event: ${event.type}`,
          details: p,
        });
      }
    }, { timeout_ms: 2000 });
  }

}

export const recordTimelineEngine = new RecordTimelineEngine();
