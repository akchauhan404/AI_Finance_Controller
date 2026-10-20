import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import Dashboard from './pages/Dashboard';
import Approvals from './pages/Approvals';
import Ingestion from './pages/Ingestion';
import Transactions from './pages/Transactions';
import Forecasts from './pages/Forecasts';
import AuditLogs from './pages/AuditLogs';
import Reports from './pages/Reports';
import Chat from './pages/Chat';

import { fetchSummary, fetchAnomalies } from './api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [summary, setSummary] = useState(null);
  const [anomalyCount, setAnomalyCount] = useState(0);

  const refreshGlobalState = async () => {
    try {
      const [sumRes, anomRes] = await Promise.all([
        fetchSummary(),
        fetchAnomalies()
      ]);
      setSummary(sumRes);
      setAnomalyCount(anomRes.length);
    } catch (err) {
      console.error('Failed to load global state:', err);
    }
  };

  useEffect(() => {
    refreshGlobalState();
  }, [activeTab]);

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingApprovalsCount={summary?.pending_approvals_count || 0}
        anomalyCount={anomalyCount}
      />

      <div className="main-content">
        <Navbar onRefreshData={refreshGlobalState} />

        <main className="page-body">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
          {activeTab === 'approvals' && <Approvals onRefreshData={refreshGlobalState} />}
          {activeTab === 'ingestion' && <Ingestion onRefreshData={refreshGlobalState} />}
          {activeTab === 'transactions' && <Transactions setActiveTab={setActiveTab} />}
          {activeTab === 'forecasts' && <Forecasts />}
          {activeTab === 'audit' && <AuditLogs />}
          {activeTab === 'reports' && <Reports />}
          {activeTab === 'chat' && <Chat />}
        </main>
      </div>
    </div>
  );
}
