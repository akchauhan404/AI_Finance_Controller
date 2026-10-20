import React from 'react';

export default function MetricCard({ title, value, subtext, icon: Icon, color = '#6366f1', trend }) {
  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background glow accent */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '90px',
        height: '90px',
        borderRadius: '50%',
        background: color,
        opacity: 0.12,
        filter: 'blur(20px)',
        pointerEvents: 'none'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </span>
        {Icon && (
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '10px',
            background: `${color}15`,
            border: `1px solid ${color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Icon size={18} color={color} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#ffffff' }} className="mono">
          {value}
        </span>
        {trend && (
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: trend.isPositive ? '#10b981' : '#f43f5e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.2rem'
          }}>
            {trend.isPositive ? '↑' : '↓'} {trend.text}
          </span>
        )}
      </div>

      {subtext && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          {subtext}
        </span>
      )}
    </div>
  );
}
