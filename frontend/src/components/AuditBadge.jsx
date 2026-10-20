import React from 'react';
import { Cpu, ShieldAlert, CheckCircle, HelpCircle } from 'lucide-react';

export default function AuditBadge({ confidence = 1.0, model = 'claude-3-5-sonnet', status = 'normal' }) {
  const confPct = Math.round(confidence * 100);

  if (status === 'flagged' || status === 'under_review') {
    return (
      <div className="badge badge-amber" title={`Model: ${model} | Confidence: ${confPct}%`}>
        <ShieldAlert size={12} />
        <span>Review ({confPct}%)</span>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="badge badge-rose" title="Overridden/Rejected by Controller">
        <ShieldAlert size={12} />
        <span>Rejected</span>
      </div>
    );
  }

  return (
    <div className="badge badge-indigo" title={`Model: ${model} | AI Confidence Score: ${confPct}%`}>
      <Cpu size={12} />
      <span>AI Verified ({confPct}%)</span>
    </div>
  );
}
