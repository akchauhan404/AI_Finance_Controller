import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Flame, 
  Clock, 
  CheckSquare, 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import MetricCard from '../components/MetricCard';
import AuditBadge from '../components/AuditBadge';
import { fetchSummary, fetchForecast, fetchVariances, fetchAnomalies, fetchAIInsights } from '../api/client';

export default function Dashboard({ setActiveTab }) {
  const [summary, setSummary] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [variances, setVariances] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [sumRes, fcRes, varRes, anomRes, insRes] = await Promise.all([
        fetchSummary(),
        fetchForecast(30),
        fetchVariances(),
        fetchAnomalies(),
        fetchAIInsights()
      ]);

      setSummary(sumRes);
      setForecast(fcRes);
      setVariances(varRes);
      setAnomalies(anomRes);
      setInsights(insRes);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    try {
      const insRes = await fetchAIInsights();
      setInsights(insRes);
    } catch (err) {
      console.error('Failed to refresh insights:', err);
    }
  };

  if (loading || !summary) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <Sparkles className="spin" size={24} color="#6366f1" />
        <span>Loading AI Controllership Dashboard...</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Executive Controllership Overview</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Real-time cash positions, deterministic burn metrics, and AI narrative intelligence.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setActiveTab('chat')}>
          <Sparkles size={16} />
          <span>Ask AI Finance Controller</span>
        </button>
      </div>

      {/* Anomaly Alerts Banner */}
      {anomalies.length > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '14px',
          padding: '1rem 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ background: '#f59e0b', padding: '0.5rem', borderRadius: '10px', display: 'flex' }}>
              <AlertTriangle size={18} color="#000" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff' }}>
                {anomalies.length} Flagged Financial Anomalies Require Review
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {anomalies[0]?.message}
              </div>
            </div>
          </div>
          <button className="btn btn-glass" onClick={() => setActiveTab('approvals')} style={{ fontSize: '0.8rem' }}>
            <span>Review Approvals Queue</span>
            <ArrowUpRight size={14} />
          </button>
        </div>
      )}

      {/* Top 4 Key Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <MetricCard
          title="Total Cash Balance"
          value={`$${summary.total_balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext="Across all connected accounts"
          icon={DollarSign}
          color="#10b981"
        />
        <MetricCard
          title="Net Monthly Burn"
          value={`$${summary.net_burn_rate.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`Gross Expenses: $${summary.monthly_expenses.toLocaleString()}`}
          icon={Flame}
          color="#f43f5e"
        />
        <MetricCard
          title="Operating Runway"
          value={
            summary.runway_months === null
              ? "No Net Burn"
              : `${summary.runway_months} Months`
          }
          subtext={
            summary.runway_months === null
              ? "Income currently covers expenses"
              : "Calculated from current net burn"
          }
          icon={Clock}
          color="#06b6d4"
          trend={
            summary.runway_months === null
              ? { isPositive: true, text: "No Burn" }
              : {
                  isPositive: summary.runway_months >= 6,
                  text: summary.runway_months >= 6 ? "Healthy" : "Low"
                }
          }
        />
        <MetricCard
          title="Pending Approvals"
          value={summary.pending_approvals_count}
          subtext={
            summary.pending_approvals_count === 0
              ? "No approvals awaiting review"
              : "Approvals awaiting review"
          }
          icon={CheckSquare}
          color="#f59e0b"
        />
      </div>

      {/* AI Narrative Insights Panel */}
      {insights && (
        <div className="glass-card" style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(16, 185, 129, 0.08) 100%)',
          border: '1px solid var(--border-glow)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ background: '#6366f1', padding: '0.4rem', borderRadius: '8px', display: 'flex' }}>
                <Sparkles size={16} color="#fff" />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>AI Controller Narrative Synthesis</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AuditBadge confidence={0.98} model={insights.model_used || "gemini-1.5-flash"} />
              <button
                onClick={refreshInsights}
                title="Re-calculate AI narrative insights"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '6px',
                  color: '#cbd5e1',
                  padding: '0.35rem 0.6rem',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sparkles size={12} color="#818cf8" />
                <span>Re-analyze</span>
              </button>
            </div>
          </div>
          <div style={{
            fontSize: '0.9rem',
            lineHeight: '1.6',
            color: 'var(--text-main)',
            whiteSpace: 'pre-line',
            background: 'rgba(15, 23, 42, 0.4)',
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {insights.insights_markdown}
          </div>
        </div>
      )}

      {/* Two Column Charts Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '1.25rem' }}>
        {/* 30-Day Cash Flow Projection Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>30-Day Cash Flow Forecast</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Moving average + linear trend regression with 95% confidence bounds.</p>
            </div>
            <span className="badge badge-emerald">Deterministic Engine</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecast}>
                <defs>
                  <linearGradient id="colorBal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: '10px', color: '#fff' }}
                  formatter={(val) => [`$${Number(val).toLocaleString()}`, 'Predicted Balance']}
                />
                <Area type="monotone" dataKey="predicted_balance" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorBal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget vs Actual Variance Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#fff' }}>Budget vs. Actual Expenses</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Monthly budget target allocation vs 30-day actual ledger spend.</p>
            </div>
            <span className="badge badge-indigo">Variance Calc</span>
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={variances.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="category_name" stroke="#64748b" fontSize={10} tickFormatter={(val) => val.split(' ')[0]} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: '10px', color: '#fff' }} />
                <Bar dataKey="budget" name="Monthly Budget" fill="#334155" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual Spend" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
