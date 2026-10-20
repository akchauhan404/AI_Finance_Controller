import React, { useState, useRef,useEffect } from 'react';
import { UploadCloud, FileText, Zap, CheckCircle2, FileUp, Sparkles, AlertCircle, Trash2 } from 'lucide-react';
import { uploadCSV, uploadInvoice, syncPlaidBankFeed, clearAllData,fetchAccounts} from '../api/client';

export default function Ingestion({ onRefreshData }) {
  const [csvContent, setCsvContent] = useState('');
  const [selectedFileName, setSelectedFileName] = useState(null);
  const [clearExisting, setClearExisting] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceText, setInvoiceText] = useState('');

  const [loadingCSV, setLoadingCSV] = useState(false);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [loadingPlaid, setLoadingPlaid] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);

  const [csvStatus, setCsvStatus] = useState(null);
  const [invoiceStatus, setInvoiceStatus] = useState(null);
  const [plaidStatus, setPlaidStatus] = useState(null);
  const [clearStatus, setClearStatus] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoadingAccounts(true);
  
        const data = await fetchAccounts();
  
        setAccounts(data);
  
        if (data.length > 0) {
          setSelectedAccountId(String(data[0].id));
        }
      } catch (error) {
        console.error('Failed to load accounts:', error);
        setAccounts([]);
      } finally {
        setLoadingAccounts(false);
      }
    };
  
    loadAccounts();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
  
    if (!file) {
      setSelectedFileName(null);
      setCsvContent('');
      setCsvStatus(null);
      return;
    }
  
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFileName(null);
      setCsvContent('');
      setCsvStatus('Please select a valid CSV file.');
      return;
    }
  
    setSelectedFileName(file.name);
    setCsvStatus(null);
  
    const reader = new FileReader();
  
    reader.onload = (event) => {
      const content = event.target?.result;
  
      if (typeof content !== 'string' || !content.trim()) {
        setCsvContent('');
        setCsvStatus('The selected CSV file is empty.');
        return;
      }
  
      setCsvContent(content);
    };
  
    reader.onerror = () => {
      setCsvContent('');
      setCsvStatus('Unable to read the selected CSV file.');
    };
  
    reader.readAsText(file);
  };

  const handleCSVUpload = async () => {
    if (!selectedFileName) {
      setCsvStatus('Please select a CSV file before uploading.');
      return;
    }
  
    if (!csvContent.trim()) {
      setCsvStatus('The selected CSV file is empty.');
      return;
    }
  
    setLoadingCSV(true);
    setCsvStatus(null);
  
    try {
      if (!selectedAccountId) {
        setCsvStatus('Please select an account before uploading.');
        return;
      }
      
      const res = await uploadCSV(
        csvContent,
        Number(selectedAccountId),
        clearExisting
      );
  
      setCsvStatus(
        res.message ||
        `Successfully imported ${res.imported_count || 0} transactions.`
      );
  
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (error) {
      console.error('CSV upload error:', error);
  
      setCsvStatus(
        error.response?.data?.detail ||
        'Failed to upload CSV. Please check the file format.'
      );
    } finally {
      setLoadingCSV(false);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to delete all ledger transactions, invoices, approvals, and alerts?')) {
      return;
    }
    try {
      setLoadingClear(true);
      setClearStatus(null);
      const res = await clearAllData();
      setClearStatus(res.message || 'All ledger data cleared.');
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      setClearStatus('Failed to clear data');
    } finally {
      setLoadingClear(false);
    }
  };

  const handleInvoiceUpload = async () => {
    if (!invoiceName.trim()) {
      setInvoiceStatus('Please enter an invoice filename.');
      return;
    }
  
    if (!invoiceText.trim()) {
      setInvoiceStatus('Please provide invoice content.');
      return;
    }
  
    try {
      setLoadingInvoice(true);
      setInvoiceStatus(null);
  
      const res = await uploadInvoice(invoiceName, invoiceText);
  
      setInvoiceStatus(
        `Parsed: ${res.message} (Amount: $${res.amount})`
      );
  
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err) {
      console.error('Invoice parsing error:', err);
  
      setInvoiceStatus(
        err.response?.data?.detail ||
        'Invoice parsing failed. Please check the invoice data.'
      );
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePlaidSync = async () => {
    try {
      setLoadingPlaid(true);
      setPlaidStatus(null);
      const res = await syncPlaidBankFeed();
      setPlaidStatus(res.message);
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error(err);
      setPlaidStatus('Plaid Sync Failed');
    } finally {
      setLoadingPlaid(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Ingestion Layer & Connectors</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Normalizes multi-source financial inputs (CSV, Plaid Sandbox, Invoice PDFs) into standardized, AI-tagged ledger records.
          </p>
        </div>
        <button
          onClick={handleClearAllData}
          disabled={loadingClear}
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            padding: '0.5rem 1rem',
            borderRadius: '10px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            transition: 'all 0.2s ease'
          }}
        >
          <Trash2 size={16} />
          <span>{loadingClear ? 'Wiping All Data...' : 'Delete / Clear All Ledger Data'}</span>
        </button>
      </div>

      {clearStatus && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '10px',
          padding: '0.75rem 1rem',
          color: '#f87171',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{clearStatus}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
        {/* 1. Interactive CSV Ledger File Upload */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <UploadCloud size={20} color="#6366f1" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>CSV Ledger Import Connector</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Auto-categorized &amp; normalized into Postgres</span>
            </div>
          </div>
        {/* Account Selection */}
<div style={{ marginBottom: '1rem' }}>
  <label
    style={{
      display: 'block',
      fontSize: '0.8rem',
      fontWeight: 700,
      color: 'var(--text-muted)',
      marginBottom: '0.5rem'
    }}
  >
    Import Into Account
  </label>

  <select
    value={selectedAccountId}
    onChange={(e) => setSelectedAccountId(e.target.value)}
    disabled={loadingAccounts || accounts.length === 0}
    style={{
      width: '100%',
      padding: '0.75rem',
      borderRadius: '8px',
      border: '1px solid var(--border)',
      background: 'var(--bg-secondary)',
      color: '#fff'
    }}
  >
    {loadingAccounts ? (
      <option value="">Loading accounts...</option>
    ) : accounts.length === 0 ? (
      <option value="">No accounts available</option>
    ) : (
      accounts.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} — {account.currency}
        </option>
      ))
    )}
  </select>
</div>
          {/* Clear Existing Toggle Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              style={{ accentColor: '#6366f1', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span>Clear existing ledger data before importing this CSV</span>
          </label>

          {/* File Picker Drag & Drop Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: '2px dashed var(--border-glow)',
              borderRadius: '12px',
              padding: '1.25rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(15, 23, 42, 0.6)',
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <FileUp size={28} color="#818cf8" style={{ marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
              {selectedFileName ? `Loaded: ${selectedFileName}` : 'Click to Select or Drop a CSV File'}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports .csv files with date, description, amount headers</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
          </div>

          {/* CSV Raw Content Preview / Editor */}
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginBottom: '0.35rem', display: 'block' }}>
              CSV Content Payload Preview:
            </span>
            <textarea
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '0.75rem',
                color: '#a5b4fc',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
                outline: 'none',
                resize: 'vertical'
              }}
            />
          </div>

          <button className="btn btn-primary" onClick={handleCSVUpload} disabled={loadingCSV ||loadingAccounts ||
  !selectedAccountId ||!selectedFileName ||!csvContent.trim()}>
            <UploadCloud size={16} />
            <span>{loadingCSV ? 'Ingesting CSV & Categorizing...' : 'Upload & Process CSV Ledger'}</span>
          </button>

          {csvStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>{csvStatus}</span>
            </div>
          )}
        </div>

        {/* 2. Plaid Sandbox Live Sync */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <Zap size={20} color="#06b6d4" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Plaid Sandbox Feed</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated Bank Webhook Sync</span>
            </div>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Simulates real-time bank statement syncing from Chase Operating and SVB Payroll checking feeds.
          </p>

          <button className="btn btn-glass" onClick={handlePlaidSync} disabled={loadingPlaid} style={{ marginTop: 'auto' }}>
            <Zap size={16} color="#06b6d4" />
            <span>{loadingPlaid ? 'Ingesting Bank Feed...' : 'Trigger Plaid Bank Sync'}</span>
          </button>

          {plaidStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>{plaidStatus}</span>
            </div>
          )}
        </div>

        {/* 3. Invoice OCR Parser */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '0.5rem', borderRadius: '10px' }}>
              <FileText size={20} color="#f59e0b" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>Invoice PDF / OCR Parser</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Extracts Vendor, Amount &amp; Due Date</span>
            </div>
          </div>

          <input
            type="text"
            value={invoiceName}
            onChange={(e) => setInvoiceName(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '0.5rem 0.75rem',
              color: '#fff',
              fontSize: '0.8rem'
            }}
          />

          <textarea
            value={invoiceText}
            onChange={(e) => setInvoiceText(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              padding: '0.75rem',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none'
            }}
          />

          <button className="btn btn-glass" onClick={handleInvoiceUpload} disabled={loadingInvoice || !invoiceName.trim()|| !invoiceText.trim()}>
            <Sparkles size={16} color="#f59e0b" />
            <span>{loadingInvoice ? 'Extracting OCR Fields...' : 'Extract Invoice & Match Vendor'}</span>
          </button>

          {invoiceStatus && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
              <CheckCircle2 size={16} />
              <span>{invoiceStatus}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
