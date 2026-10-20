import React, { useState, useEffect } from 'react';
import { ShieldCheck, Zap, Bot, Database, Key, Trash2, X } from 'lucide-react';
import { syncPlaidBankFeed, resetSeedData, clearAllData } from '../api/client';

export default function Navbar({ onRefreshData }) {
  const [loadingPlaid, setLoadingPlaid] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);
  const [loadingClear, setLoadingClear] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');

  useEffect(() => {
    const k = localStorage.getItem('gemini_api_key') || '';
    setSavedKey(k);
    setGeminiKey(k);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('gemini_api_key', geminiKey.trim());
    setSavedKey(geminiKey.trim());
    setShowKeyModal(false);
    if (onRefreshData) onRefreshData();
  };

  const handleClearKey = () => {
    localStorage.removeItem('gemini_api_key');
    setGeminiKey('');
    setSavedKey('');
    setShowKeyModal(false);
    if (onRefreshData) onRefreshData();
  };

  const handlePlaidSync = async () => {
    try {
      setLoadingPlaid(true);
      await syncPlaidBankFeed();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Plaid Sync Error:', err);
    } finally {
      setLoadingPlaid(false);
    }
  };

  const handleResetSeed = async () => {
    if (!window.confirm('Reset database to clean Acme Tech Inc. baseline seed state?')) return;
    try {
      setLoadingReset(true);
      await resetSeedData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Reset Error:', err);
    } finally {
      setLoadingReset(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Wipe ALL transactions and invoices to upload your own custom CSV file?')) return;
    try {
      setLoadingClear(true);
      await clearAllData();
      if (onRefreshData) onRefreshData();
    } catch (err) {
      console.error('Clear All Error:', err);
    } finally {
      setLoadingClear(false);
    }
  };

  return (
    <>
      <header style={{
        height: '70px',
        borderBottom: '1px solid var(--border-glass)',
        background: 'rgba(9, 13, 22, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
          }}>
            <Bot size={22} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#fff' }}>
              AI Finance Controller
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Controllership Engine • Deterministic Rules • {savedKey ? 'Google Gemini Active' : 'LLM Fallback Engine'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* Gemini API Key Button */}
          <button
            className={`btn ${savedKey ? 'btn-emerald' : 'btn-glass'}`}
            onClick={() => setShowKeyModal(true)}
            style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', border: savedKey ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-glass)' }}
          >
            <Key size={14} color={savedKey ? '#10b981' : '#a5b4fc'} />
            <span>{savedKey ? 'Gemini Active' : 'Connect Gemini API Key'}</span>
          </button>

          <div className="badge badge-emerald">
            <ShieldCheck size={14} />
            <span>Postgres Ledger Active</span>
          </div>

          <button 
            className="btn btn-glass"
            onClick={handlePlaidSync}
            disabled={loadingPlaid}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
          >
            <Zap size={15} color="#06b6d4" className={loadingPlaid ? 'spin' : ''} />
            <span>{loadingPlaid ? 'Syncing...' : 'Plaid Sync'}</span>
          </button>

          {/* Clear All Data Button */}
          <button 
            className="btn btn-glass"
            onClick={handleClearAll}
            disabled={loadingClear}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.25)' }}
          >
            <Trash2 size={15} color="#f43f5e" />
            <span>{loadingClear ? 'Wiping...' : 'Clear All Data'}</span>
          </button>

          <button 
            className="btn btn-glass"
            onClick={handleResetSeed}
            disabled={loadingReset}
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.875rem' }}
          >
            <Database size={15} color="#f59e0b" />
            <span>{loadingReset ? 'Resetting...' : 'Reset DB'}</span>
          </button>
        </div>
      </header>

      {/* Gemini Key Modal */}
      {showKeyModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100
        }}>
          <div className="glass-card" style={{ width: '480px', padding: '2rem', background: '#0f172a', border: '1px solid var(--border-glow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Key size={22} color="#10b981" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff' }}>Google Gemini API Key</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Paste your free Google Gemini API Key below. The AI Finance Controller will use <strong>Gemini</strong> for categorization, RAG chat, and executive insights.
            </p>

            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid var(--border-glass)',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                marginBottom: '1.5rem'
              }}
            />

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              {savedKey && (
                <button className="btn btn-glass" onClick={handleClearKey} style={{ color: '#f43f5e' }}>
                  Remove Key
                </button>
              )}
              <button className="btn btn-primary" onClick={handleSaveKey}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
