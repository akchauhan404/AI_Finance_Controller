import React, { useState, useEffect } from 'react';
import { FileText, Download, Sparkles, Printer } from 'lucide-react';
import { generateAIReport } from '../api/client';
import AuditBadge from '../components/AuditBadge';

export default function Reports() {
  const [reportType, setReportType] = useState('monthly_summary');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    handleGenerateReport();
  }, [reportType]);

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const res = await generateAIReport(reportType);
      setReportData(res);
    } catch (err) {
      console.error('Report Generation Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>AI Narrative Reports &amp; Attestations</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Templated report generation: precomputed stats in, narrative out. Zero arithmetic hallucination risk.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            style={{
              padding: '0.6rem 1rem',
              borderRadius: '10px',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              color: '#fff',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="monthly_summary">Monthly Controllership Report</option>
            <option value="expense_deep_dive">Quarterly Expense Deep-Dive</option>
            <option value="cashflow_outlook">Cashflow &amp; Runway Risk Outlook</option>
          </select>

          <button className="btn btn-glass" onClick={handlePrint}>
            <Printer size={16} />
            <span>Export / Print</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh', color: 'var(--text-muted)', gap: '0.5rem' }}>
          <Sparkles className="spin" size={24} color="#6366f1" />
          <span>Synthesizing Financial Report with Claude 3.5 Sonnet...</span>
        </div>
      ) : reportData ? (
        <div className="glass-card" style={{ padding: '2.5rem', background: '#0f172a', border: '1px solid var(--border-glow)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FileText size={28} color="#818cf8" />
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff' }}>{reportData.title}</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Generated at {new Date(reportData.created_at).toLocaleString()}</span>
              </div>
            </div>
            <AuditBadge confidence={1.0} model="claude-3-5-sonnet" />
          </div>

          <div style={{
            fontSize: '0.9rem',
            lineHeight: '1.7',
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            fontFamily: 'var(--font-main)'
          }}>
            {reportData.report_markdown}
          </div>
        </div>
      ) : null}
    </div>
  );
}
