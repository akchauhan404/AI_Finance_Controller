import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, ShieldAlert, UserCheck, Lock, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { fetchApprovals, submitApprovalDecision } from '../api/client';
import AuditBadge from '../components/AuditBadge';

export default function Approvals({ onRefreshData }) {
  const [approvals, setApprovals] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    loadApprovals();
  }, [filter]);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const res = await fetchApprovals(filter);
      setApprovals(res);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approvalId, action) => {
    try {
      setProcessingId(approvalId);
      await submitApprovalDecision(approvalId, action, 'Controller (You)');
      
      if (action === 'approve') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      await loadApprovals();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Approval decision error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Approval Queue & Governance</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Human-in-the-loop dual control for high-value transactions and low-confidence AI categorizations.
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
          {['pending', 'approved', 'rejected'].map(st => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: filter === st ? '#6366f1' : 'transparent',
                color: filter === st ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', gap: '0.5rem' }}>
          <Sparkles className="spin" size={20} color="#6366f1" />
          <span>Loading approval queue...</span>
        </div>
      ) : approvals.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>All Clear! No {filter} approvals.</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Every financial transaction meeting threshold limits has been reviewed and signed off.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.25rem' }}>
          {approvals.map(app => (
            <div key={app.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '4px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div className="badge badge-amber" style={{ marginBottom: '0.5rem' }}>
                    <Lock size={12} />
                    <span>{app.threshold_rule_applied || 'Threshold Governance'}</span>
                  </div>
                  <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                    {app.transaction?.description || `Transaction #${app.transaction_id}`}
                  </h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Requested by: {app.requested_by}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff' }} className="mono">
                    ${app.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                    {app.transaction ? new Date(app.transaction.date).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
              </div>

              {app.transaction && (
                <div style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  padding: '0.875rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  fontSize: '0.85rem',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem'
                }}>
                  <div>
                    <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem' }}>Assigned Category</span>
                    <span style={{ fontWeight: 600, color: '#a5b4fc' }}>{app.transaction.category || 'Uncategorized'}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-subtle)', display: 'block', fontSize: '0.75rem' }}>Source Feed</span>
                    <span style={{ fontWeight: 600, color: '#06b6d4', textTransform: 'capitalize' }}>{app.transaction.source}</span>
                  </div>
                </div>
              )}

              {filter === 'pending' ? (
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.5rem' }}>
                  <button
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    disabled={processingId === app.id}
                    onClick={() => handleDecision(app.id, 'approve')}
                  >
                    <CheckCircle2 size={16} />
                    <span>Approve & Post</span>
                  </button>

                  <button
                    className="btn btn-danger"
                    style={{ flex: 1 }}
                    disabled={processingId === app.id}
                    onClick={() => handleDecision(app.id, 'reject')}
                  >
                    <XCircle size={16} />
                    <span>Reject</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <UserCheck size={14} color="#10b981" />
                    <span>Decision by: {app.approver_id || 'Controller'}</span>
                  </div>
                  <span className={`badge ${app.status === 'approved' ? 'badge-emerald' : 'badge-rose'}`} style={{ textTransform: 'uppercase' }}>
                    {app.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
