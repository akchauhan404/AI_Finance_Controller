import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { fetchForecast, fetchVariances } from '../api/client';

export default function Forecasts() {
  const [days, setDays] = useState(30);
  const [forecast, setForecast] = useState([]);
  const [variances, setVariances] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [days]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fcRes, varRes] = await Promise.all([
        fetchForecast(days),
        fetchVariances()
      ]);
      setForecast(fcRes);
      setVariances(varRes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Cash Flow Forecasting & Budget Variances</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Deterministic statistical predictions (moving average + linear trend) and monthly budget variance math.
          </p>
        </div>

        {/* Horizon Selector */}
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.25rem', borderRadius: '10px' }}>
          {[7, 14, 30].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '0.4rem 0.875rem',
                borderRadius: '8px',
                border: 'none',
                background: days === d ? '#6366f1' : 'transparent',
                color: days === d ? '#fff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', gap: '0.5rem' }}>
          <Sparkles className="spin" size={20} color="#6366f1" />
          <span>Generating cash flow model...</span>
        </div>
      ) : (
        <>
          {/* Main Forecast Graph */}
          <div className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>
                  {days}-Day Cash Reserve Trajectory
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Expected End Balance: <strong style={{ color: '#10b981' }}>${forecast[forecast.length - 1]?.predicted_balance?.toLocaleString()}</strong>
                </span>
              </div>
              <span className="badge badge-indigo">Statistical Time-Series Model</span>
            </div>

            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast}>
                  <defs>
                    <linearGradient id="colorBalMain" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `$${v / 1000}k`} />
                  <Tooltip contentStyle={{ background: '#1e293b', borderColor: '#334155', borderRadius: '10px', color: '#fff' }} />
                  <Area type="monotone" dataKey="upper_bound" stroke="transparent" fill="#334155" fillOpacity={0.2} name="Upper Bound (95%)" />
                  <Area type="monotone" dataKey="predicted_balance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorBalMain)" name="Predicted Balance" />
                  <Area type="monotone" dataKey="lower_bound" stroke="transparent" fill="#334155" fillOpacity={0.2} name="Lower Bound (95%)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Budget Variance Table */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>
              Category Budget vs. Actual Variances
            </h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Monthly Budget Target</th>
                    <th>Actual 30-Day Spend</th>
                    <th>Dollar Variance</th>
                    <th>Percentage (%)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {variances.map(v => (
                    <tr key={v.category_id}>
                      <td style={{ fontWeight: 600, color: '#fff' }}>{v.category_name}</td>
                      <td className="mono">${v.budget.toLocaleString()}</td>
                      <td className="mono">${v.actual.toLocaleString()}</td>
                      <td className="mono" style={{ color: v.variance > 0 ? '#f43f5e' : '#10b981' }}>
                        {v.variance > 0 ? `+$${v.variance.toLocaleString()}` : `-$${Math.abs(v.variance).toLocaleString()}`}
                      </td>
                      <td style={{ fontWeight: 700, color: v.pct_variance > 0 ? '#f43f5e' : '#10b981' }}>
                        {v.pct_variance > 0 ? `+${v.pct_variance}%` : `${v.pct_variance}%`}
                      </td>
                      <td>
                        {v.over_budget ? (
                          <span className="badge badge-rose">Over Budget</span>
                        ) : (
                          <span className="badge badge-emerald">On Target</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
