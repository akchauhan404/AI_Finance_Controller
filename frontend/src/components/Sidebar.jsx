import React from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  UploadCloud, 
  Receipt, 
  TrendingUp, 
  FileSearch, 
  FileText, 
  MessageSquare,
  AlertTriangle
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, pendingApprovalsCount = 0, anomalyCount = 0 }) {
  const menuItems = [
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'approvals', label: 'Approval Queue', icon: CheckSquare, badge: pendingApprovalsCount, badgeColor: 'badge-amber' },
    { id: 'ingestion', label: 'Ingestion & Bank Feed', icon: UploadCloud },
    { id: 'transactions', label: 'General Ledger', icon: Receipt },
    { id: 'forecasts', label: 'Forecasts & Variances', icon: TrendingUp },
    { id: 'audit', label: 'AI Audit Log', icon: FileSearch, badge: anomalyCount > 0 ? `${anomalyCount} Alerts` : null, badgeColor: 'badge-rose' },
    { id: 'reports', label: 'AI Reports Generator', icon: FileText },
    { id: 'chat', label: 'Finance RAG Chat', icon: MessageSquare }
  ];

  return (
    <aside style={{
      width: '260px',
      borderRight: '1px solid var(--border-glass)',
      background: 'rgba(15, 23, 42, 0.6)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      gap: '0.5rem'
    }}>
      <div style={{ padding: '0 0.75rem 1rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-subtle)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Navigation Menu
      </div>

      {menuItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderRadius: '12px',
              border: isActive ? '1px solid var(--border-glow)' : '1px solid transparent',
              background: isActive ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Icon size={18} color={isActive ? '#818cf8' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </div>

            {item.badge ? (
              <span className={`badge ${item.badgeColor || 'badge-indigo'}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                {item.badge}
              </span>
            ) : null}
          </button>
        );
      })}

      <div style={{ marginTop: 'auto', padding: '1rem 0.75rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
          <AlertTriangle size={14} color="#f59e0b" />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-main)' }}>Dual Control Active</span>
        </div>
        <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Transactions &gt; $5,000 require manager approval. &gt; $25,000 require dual control.
        </p>
      </div>
    </aside>
  );
}
