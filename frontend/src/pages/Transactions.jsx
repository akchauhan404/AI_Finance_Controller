import React, { useState, useEffect } from 'react';
import { Search, Filter, Sparkles, RefreshCw, Layers, UploadCloud, Database } from 'lucide-react';
import { fetchTransactions, categorizeTransactionAI } from '../api/client';
import AuditBadge from '../components/AuditBadge';

export default function Transactions({ setActiveTab }) {
  const [transactions, setTransactions] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [categorizingId, setCategorizingId] = useState(null);

  useEffect(() => {
    loadTxs();
  }, [filterStatus]);

  const loadTxs = async () => {
    try {
      setLoading(true);
      const res = await fetchTransactions({ status: filterStatus || undefined });
      setTransactions(res);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRecategorize = async (tx) => {
    try {
      setCategorizingId(tx.id);
      await categorizeTransactionAI(tx.description, tx.amount);
      await loadTxs();
    } catch (err) {
      console.error(err);
    } finally {
      setCategorizingId(null);
    }
  };

  const filtered = transactions.filter(t => 
    t.description.toLowerCase().includes(search.toLowerCase()) ||
    (t.category && t.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>General Ledger Transactions</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Live data fetched directly from Postgres Core Data Store ({transactions.length} total records).
          </p>
        </div>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={16} color="var(--text-subtle)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search description or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All Statuses</option>
            <option value="normal">Normal</option>
            <option value="under_review">Under Review</option>
            <option value="flagged">Flagged</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', gap: '0.5rem' }}>
          <Sparkles className="spin" size={20} color="#6366f1" />
          <span>Fetching live transactions from database...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3.5rem 2rem', background: 'rgba(15, 23, 42, 0.6)' }}>
          <Database size={42} color="#6366f1" style={{ marginBottom: '1rem', opacity: 0.8 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', marginBottom: '0.5rem' }}>
            No Ledger Transactions in Database
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '460px', margin: '0 auto 1.5rem auto' }}>
            Your database is currently clean and ready. Upload your custom CSV ledger file in the Ingestion tab to process live transactions.
          </p>
          <button className="btn btn-primary" onClick={() => setActiveTab && setActiveTab('ingestion')} style={{ margin: '0 auto' }}>
            <UploadCloud size={16} />
            <span>Go to Ingestion &amp; Upload CSV</span>
          </button>
        </div>
      ) : (
        <div className="glass-card table-container" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>Tx ID / Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>GL Category</th>
                <th>Source</th>
                <th>Status</th>
                <th>AI Audit</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(tx => (
                <tr key={tx.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: '#fff' }}>#{tx.id}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                      {new Date(tx.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>{tx.description}</div>
                  </td>
                  <td>
                    <span className="mono" style={{
                      fontWeight: 800,
                      color: tx.amount > 0 ? '#10b981' : '#ffffff'
                    }}>
                      {tx.amount > 0 ? `+$${tx.amount.toLocaleString()}` : `-$${Math.abs(tx.amount).toLocaleString()}`}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.12)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      {tx.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                      {tx.source}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${
                      tx.status === 'approved' ? 'badge-emerald' :
                      tx.status === 'under_review' || tx.status === 'flagged' ? 'badge-amber' :
                      tx.status === 'rejected' ? 'badge-rose' : 'badge-indigo'
                    }`}>
                      {tx.status}
                    </span>
                  </td>
                  <td>
                    <AuditBadge confidence={0.95} model="gemini-1.5-flash" status={tx.status} />
                  </td>
                  <td>
                    <button
                      className="btn btn-glass"
                      style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      disabled={categorizingId === tx.id}
                      onClick={() => handleRecategorize(tx)}
                      title="Re-categorize with AI Engine"
                    >
                      <Sparkles size={12} color="#6366f1" className={categorizingId === tx.id ? 'spin' : ''} />
                      <span>{categorizingId === tx.id ? 'Analyzing...' : 'Re-AI'}</span>
                    </button>
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
