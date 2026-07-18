/**
 * OperatorFeedbackPanel — Tablet-friendly feedback UI for shop floor
 * LATHE-PROD-READY-MS0/U-LPR-MOBILE
 *
 * Features:
 * - Touch targets ≥44px for shop floor gloves
 * - Responsive breakpoints: 768px+ landscape, 1024px+ portrait
 * - Offline-capable via OfflineQueueManager + IndexedDB
 * - Syncs thumbs up/down when back online
 */

import { useState, useEffect } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Wifi, WifiOff, Send, X } from 'lucide-react';
import { offlineQueueManager } from '../../lib/OfflineQueueManager';
import { getRequestHeaders } from '../../api/client';

interface FeedbackContext {
  machineId?: string;
  materialId?: string;
  operationType?: string;
  programId?: string;
  recommendation?: Record<string, unknown>;
}

interface OperatorFeedbackPanelProps {
  tenantId: string;
  operatorId: string;
  context: FeedbackContext;
  onFeedbackSubmitted?: (type: 'thumbs_up' | 'thumbs_down' | 'correction' | 'note') => void;
}

export function OperatorFeedbackPanel({
  tenantId,
  operatorId,
  context,
  onFeedbackSubmitted,
}: OperatorFeedbackPanelProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<string | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const unsubscribe = offlineQueueManager.subscribe(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncPendingFeedback();
    }
  }, [isOnline, pendingCount]);

  async function syncPendingFeedback() {
    try {
      await offlineQueueManager.replayAll(async (actionType, payload) => {
        // U-ERP-P2-HARDENING: /api/operator/feedback is verifyToken-gated (RLHF
        // training-data injection close). getRequestHeaders() carries the Bearer;
        // headers are read at REPLAY time so the live session's token applies.
        const res = await fetch('/api/operator/feedback', {
          method: 'POST',
          headers: getRequestHeaders(),
          body: JSON.stringify(payload),
        });
        return res;
      });
    } catch {
      // Will retry on next online event
    }
  }

  async function submitFeedback(type: 'thumbs_up' | 'thumbs_down' | 'note', reason?: string) {
    setSubmitting(true);

    const payload = {
      operatorId,
      tenantId,
      timestamp: new Date().toISOString(),
      feedbackType: type,
      context,
      reason,
      tags: [],
      rlhfEligible: type !== 'note',
    };

    try {
      if (isOnline) {
        await fetch('/api/operator/feedback', {
          method: 'POST',
          headers: getRequestHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        await offlineQueueManager.enqueue('operator_feedback', payload);
      }

      setLastFeedback(type);
      onFeedbackSubmitted?.(type);
      setTimeout(() => setLastFeedback(null), 2000);
    } catch {
      await offlineQueueManager.enqueue('operator_feedback', payload);
    } finally {
      setSubmitting(false);
      setShowNoteDialog(false);
      setNoteText('');
    }
  }

  return (
    <div className="operator-feedback-panel">
      {/* Connection status indicator */}
      <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
        {isOnline ? (
          <>
            <Wifi className="status-icon" />
            <span>Online</span>
          </>
        ) : (
          <>
            <WifiOff className="status-icon" />
            <span>Offline ({pendingCount} pending)</span>
          </>
        )}
      </div>

      {/* Main feedback buttons - large touch targets */}
      <div className="feedback-buttons">
        <button
          className={`feedback-btn thumbs-up ${lastFeedback === 'thumbs_up' ? 'active' : ''}`}
          onClick={() => submitFeedback('thumbs_up')}
          disabled={submitting}
          aria-label="Good recommendation"
        >
          <ThumbsUp className="feedback-icon" />
          <span className="feedback-label">Good</span>
        </button>

        <button
          className={`feedback-btn thumbs-down ${lastFeedback === 'thumbs_down' ? 'active' : ''}`}
          onClick={() => submitFeedback('thumbs_down')}
          disabled={submitting}
          aria-label="Bad recommendation"
        >
          <ThumbsDown className="feedback-icon" />
          <span className="feedback-label">Bad</span>
        </button>

        <button
          className={`feedback-btn note ${lastFeedback === 'note' ? 'active' : ''}`}
          onClick={() => setShowNoteDialog(true)}
          disabled={submitting}
          aria-label="Add note"
        >
          <MessageSquare className="feedback-icon" />
          <span className="feedback-label">Note</span>
        </button>
      </div>

      {/* Note dialog */}
      {showNoteDialog && (
        <div className="note-dialog-overlay" onClick={() => setShowNoteDialog(false)}>
          <div className="note-dialog" onClick={e => e.stopPropagation()}>
            <div className="note-dialog-header">
              <h3>Add Note</h3>
              <button
                className="close-btn"
                onClick={() => setShowNoteDialog(false)}
                aria-label="Close"
              >
                <X />
              </button>
            </div>
            <textarea
              className="note-input"
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Enter your feedback..."
              rows={4}
              autoFocus
            />
            <div className="note-dialog-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowNoteDialog(false)}
              >
                Cancel
              </button>
              <button
                className="submit-btn"
                onClick={() => submitFeedback('note', noteText)}
                disabled={!noteText.trim() || submitting}
              >
                <Send className="btn-icon" />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .operator-feedback-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          background: rgba(2, 6, 23, 0.78);
          border: 1px solid rgba(148, 163, 184, 0.08);
          border-radius: 12px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
        }

        .connection-status.online {
          background: rgba(34, 197, 94, 0.1);
          color: #22c55e;
        }

        .connection-status.offline {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
        }

        .status-icon {
          width: 18px;
          height: 18px;
        }

        .feedback-buttons {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .feedback-btn {
          /* Touch target ≥44px as per WCAG 2.5.5 */
          min-width: 100px;
          min-height: 64px;
          padding: 12px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: 2px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.6);
          color: #94a3b8;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          flex: 1;
        }

        .feedback-btn:hover:not(:disabled) {
          background: rgba(30, 41, 59, 0.8);
          border-color: rgba(148, 163, 184, 0.3);
        }

        .feedback-btn:active:not(:disabled) {
          transform: scale(0.98);
        }

        .feedback-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .feedback-btn.thumbs-up:hover:not(:disabled),
        .feedback-btn.thumbs-up.active {
          border-color: #22c55e;
          color: #22c55e;
          background: rgba(34, 197, 94, 0.1);
        }

        .feedback-btn.thumbs-down:hover:not(:disabled),
        .feedback-btn.thumbs-down.active {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }

        .feedback-btn.note:hover:not(:disabled),
        .feedback-btn.note.active {
          border-color: #06b6d4;
          color: #06b6d4;
          background: rgba(6, 182, 212, 0.1);
        }

        .feedback-icon {
          width: 24px;
          height: 24px;
        }

        .feedback-label {
          font-size: 13px;
        }

        /* Note dialog */
        .note-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .note-dialog {
          background: #0f172a;
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 16px;
          width: 100%;
          max-width: 500px;
          padding: 20px;
        }

        .note-dialog-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .note-dialog-header h3 {
          font-size: 18px;
          font-weight: 600;
          color: #f1f5f9;
          margin: 0;
        }

        .close-btn {
          /* 44px touch target */
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: #64748b;
          cursor: pointer;
          border-radius: 8px;
        }

        .close-btn:hover {
          background: rgba(148, 163, 184, 0.1);
          color: #94a3b8;
        }

        .note-input {
          width: 100%;
          padding: 16px;
          background: rgba(15, 23, 42, 0.8);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-radius: 12px;
          color: #f1f5f9;
          font-size: 16px;
          resize: vertical;
          min-height: 120px;
        }

        .note-input:focus {
          outline: none;
          border-color: #06b6d4;
        }

        .note-input::placeholder {
          color: #64748b;
        }

        .note-dialog-actions {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          justify-content: flex-end;
        }

        .cancel-btn,
        .submit-btn {
          /* 44px touch target */
          min-height: 48px;
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cancel-btn {
          background: transparent;
          border: 1px solid rgba(148, 163, 184, 0.2);
          color: #94a3b8;
        }

        .cancel-btn:hover {
          background: rgba(148, 163, 184, 0.1);
        }

        .submit-btn {
          background: #06b6d4;
          border: none;
          color: white;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0891b2;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        /* Tablet responsive breakpoints */
        @media (min-width: 768px) and (orientation: landscape) {
          .operator-feedback-panel {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }

          .feedback-buttons {
            flex-wrap: nowrap;
          }

          .feedback-btn {
            min-width: 120px;
            min-height: 72px;
          }
        }

        @media (min-width: 1024px) {
          .feedback-btn {
            min-width: 140px;
            min-height: 80px;
          }

          .feedback-icon {
            width: 28px;
            height: 28px;
          }

          .feedback-label {
            font-size: 14px;
          }
        }

        /* Large touch displays (shop floor TVs) */
        @media (min-width: 1920px) {
          .feedback-btn {
            min-width: 180px;
            min-height: 100px;
          }

          .feedback-icon {
            width: 36px;
            height: 36px;
          }

          .feedback-label {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
}

export default OperatorFeedbackPanel;
