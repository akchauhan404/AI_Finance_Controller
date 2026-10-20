import React, { useState } from 'react';
import { Send, Bot, User, Sparkles, Database, ShieldCheck } from 'lucide-react';
import { sendAIChatQuery } from '../api/client';
import AuditBadge from '../components/AuditBadge';

export default function Chat() {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: 'Hello! I am your AI Finance Controller Assistant. I utilize Retrieval-Augmented Generation (RAG) to query your live Postgres database deterministically before generating explanations.\n\nHow can I help analyze your runway, expenses, or anomalies today?',
      context: ['Initial System Prompt Loaded', 'Ledger Context Ready']
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const samplePrompts = [
    'What is our current cash runway and net burn?',
    'Show top 5 vendor expenses',
    'Are there any duplicate payment anomalies?',
    'Explain our AWS cloud spending trend'
  ];

  const handleSend = async (queryText) => {
    const q = queryText || input;
    if (!q.trim()) return;

    const userMsg = { sender: 'user', text: q };
    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInput('');

    try {
      setLoading(true);
      const res = await sendAIChatQuery(q);
      const aiMsg = {
        sender: 'ai',
        text: res.answer,
        context: res.retrieved_context
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Error retrieving financial context. Please ensure backend is active.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', gap: '1rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Retrieval-Augmented Financial Assistant</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Strict Design Rule: Queries SQL ledger context first. Never answers financial math from memory.
        </p>
      </div>

      {/* Chat Messages Box */}
      <div className="glass-card" style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        overflowY: 'auto',
        padding: '1.5rem'
      }}>
        {messages.map((m, idx) => (
          <div key={idx} style={{
            display: 'flex',
            gap: '1rem',
            alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: m.sender === 'user' ? '75%' : '85%'
          }}>
            {m.sender === 'ai' && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Bot size={20} color="#fff" />
              </div>
            )}

            <div style={{
              background: m.sender === 'user' ? 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' : 'rgba(15, 23, 42, 0.8)',
              border: m.sender === 'user' ? 'none' : '1px solid var(--border-glass)',
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              color: '#fff',
              fontSize: '0.9rem',
              lineHeight: '1.6'
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>

              {m.context && m.context.length > 0 && (
                <div style={{
                  marginTop: '0.875rem',
                  paddingTop: '0.75rem',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  fontSize: '0.75rem',
                  color: '#a5b4fc'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.35rem', fontWeight: 700 }}>
                    <Database size={12} color="#06b6d4" />
                    <span>Retrieved Ledger Context (RAG):</span>
                  </div>
                  {m.context.map((c, i) => (
                    <div key={i} style={{ opacity: 0.8, fontFamily: 'var(--font-mono)' }}>• {c}</div>
                  ))}
                </div>
              )}
            </div>

            {m.sender === 'user' && (
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <User size={20} color="#fff" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            <Sparkles className="spin" size={18} color="#6366f1" />
            <span>Querying SQL database and generating narrative response...</span>
          </div>
        )}
      </div>

      {/* Suggested Prompt Pills */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {samplePrompts.map((sp, idx) => (
          <button
            key={idx}
            className="btn btn-glass"
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
            onClick={() => handleSend(sp)}
          >
            <span>{sp}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} style={{ display: 'flex', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Ask a question about cash flow, burn rate, invoices, or budget variances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          style={{
            flex: 1,
            padding: '0.875rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(15, 23, 42, 0.9)',
            border: '1px solid var(--border-glow)',
            color: '#fff',
            fontSize: '0.9rem',
            outline: 'none'
          }}
        />
        <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
          <Send size={16} />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
