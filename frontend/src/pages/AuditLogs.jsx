import React, { useState, useEffect } from 'react';
import { FileSearch, ShieldCheck, CheckCircle2, UserCheck, AlertTriangle, Sparkles } from 'lucide-react';
import { fetchAuditLogs, reviewAuditLog } from '../api/client';
import AuditBadge from '../components/AuditBadge';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await fetchAuditLogs();
      setLogs(res);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (actionId, approved, overrideCategory = null) => {
    try {
      setReviewingId(actionId);
      await reviewAuditLog(actionId, approved, overrideCategory);
      await loadLogs();
    } catch (err) {
      console.error(err);
    } finally {
      setReviewingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Immutable AI Audit Log (<code className="mono">ai_actions</code>)</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Every AI-generated classification, anomaly alert, insight, and chat response is logged with model metadata &amp; human override tracking.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', gap: '0.5rem' }}>
          <Sparkles className="spin" size={20} color="#6366f1" />
          <span>Fetching immutable audit ledger...</span>
        </div>
      ) : (
        <div className="glass-card table-container" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Log ID / Time</th>
                <th>Action Type</th>
                <th>Input Ref</th>
                <th>AI Output / Reasoning</th>
                <th>Confidence</th>
                <th>Model Used</th>
                <th>Human Review Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>#{log.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {new Date(log.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-indigo" style={{ textTransform: 'uppercase' }}>
                      {log.type}
                    </span>
                  </td>
                  <td className="mono" style={{ fontSize: '0.75rem', color: '#a5b4fc' }}>
                    {log.input_ref || 'N/A'}
                  </td>
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-main)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }} title={log.output}>
                      {log.output}
                    </div>
                  </td>
                  <td>
                    <AuditBadge confidence={log.confidence_score} model={log.model_used} />
                  </td>
                  <td className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {log.model_used}
                  </td>
                  <td>
                    {log.human_reviewed ? (
                      <span className={`badge ${log.human_override ? 'badge-rose' : 'badge-emerald'}`}>
                        {log.human_override ? 'Override' : 'Reviewed'} ({log.reviewer_id || 'Human'})
                      </span>
                    ) : (
                      <span className="badge badge-amber">Unreviewed</span>
                    )}
                  </td>
                  <td>
                    {!log.human_reviewed && (
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          className="btn btn-glass"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          disabled={reviewingId === log.id}
                          onClick={() => handleReviewAction(log.id, true)}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn btn-glass"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', color: '#f43f5e' }}
                          disabled={reviewingId === log.id}
                          onClick={() => handleReviewAction(log.id, false, 'Manual Override')}
                        >
                          Override
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
