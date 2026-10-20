import axios from 'axios';

const API_BASE = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getGeminiKey = () => localStorage.getItem('gemini_api_key') || '';

export const fetchSummary = async () => (await api.get('/finance/summary')).data;
export const fetchAccounts = async () => (await api.get('/finance/accounts')).data;
export const fetchTransactions = async (params = {}) => (await api.get('/finance/transactions', { params })).data;
export const fetchVendors = async () => (await api.get('/finance/vendors')).data;
export const fetchCategories = async () => (await api.get('/finance/categories')).data;
export const fetchInvoices = async () => (await api.get('/finance/invoices')).data;
export const resetSeedData = async () => (await api.post('/finance/reset-seed')).data;
export const clearAllData = async () => (await api.post('/finance/clear-all')).data;

// Ingestion
export const uploadCSV = async (
  csvContent,
  accountId,
  clearExisting = false
) =>
  (
    await api.post('/ingestion/csv', {
      csv_content: csvContent,
      account_id: accountId,
      clear_existing: clearExisting
    })
  ).data;
  export const uploadInvoice = async (fileName, rawText) =>
  (await api.post('/ingestion/invoice', {
    file_name: fileName,
    raw_text: rawText
  })).data;

export const syncPlaidBankFeed = async () =>
  (await api.post('/ingestion/plaid-sync')).data;

// Analytics
export const fetchAnomalies = async () => (await api.get('/analytics/anomalies')).data;
export const fetchRunway = async () => (await api.get('/analytics/runway')).data;
export const fetchVariances = async () => (await api.get('/analytics/variances')).data;
export const fetchForecast = async (days = 30) => (await api.get('/analytics/forecast', { params: { days } })).data;

// Governance
export const fetchApprovals = async (status) => (await api.get('/governance/approvals', { params: { status } })).data;
export const submitApprovalDecision = async (approvalId, action, approverId = 'Finance Lead') =>
  (await api.post('/governance/approvals/decision', { approval_id: approvalId, action, approver_id: approverId })).data;
export const fetchAlerts = async () => (await api.get('/governance/alerts')).data;
export const acknowledgeAlert = async (alertId) => (await api.post(`/governance/alerts/${alertId}/acknowledge`)).data;
export const fetchAuditLogs = async () => (await api.get('/governance/audit-log')).data;
export const reviewAuditLog = async (actionId, approved, overrideCategory = null) =>
  (await api.post('/governance/audit-log/review', { action_id: actionId, approved, override_category: overrideCategory })).data;

// AI Engine (Attaches Gemini API Key automatically)
export const categorizeTransactionAI = async (description, amount, vendorName = '') =>
  (await api.post('/ai/categorize', null, { params: { description, amount, vendor_name: vendorName, api_key: getGeminiKey() } })).data;

export const fetchAIInsights = async () =>
  (await api.get('/ai/insights', { params: { api_key: getGeminiKey() } })).data;

export const sendAIChatQuery = async (question) =>
  (await api.post('/ai/chat', { question }, { params: { api_key: getGeminiKey() } })).data;

export const generateAIReport = async (reportType = 'monthly_summary') =>
  (await api.get('/ai/report', { params: { report_type: reportType, api_key: getGeminiKey() } })).data;

export default api;
