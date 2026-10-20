# AI Finance Controller

An Autonomous, Enterprise-grade AI Financial Controllership Platform combining Deterministic Analytics, Dual-Control Governance, Automated Ingestion, and RAG Copilot Intelligence.

---

## 🌟 Key Features

- **Executive Financial Dashboard**: Real-time KPI monitoring including Cash Balance, Monthly Net Burn, Runway (Months), and Automated Spend Category Breakdown.
- **Multi-Channel Ingestion Pipeline**:
  - Direct Bank Feed Sync Simulator (Plaid-like).
  - Bulk CSV Statement parser.
  - Smart Invoice OCR Extraction powered by Google Gemini (Vendor, Date, Tax, Total Amount, Line Items).
- **Deterministic Analytics Engine**:
  - Statistical Z-Score Anomaly Detection (> 2.5 $\sigma$ above mean).
  - 48-hour Duplicate Vendor Payment Alerts.
  - Weekend / Off-hours High Expense monitoring.
  - 30 / 60 / 90-Day Cash Runway Forecasting.
- **Dual-Control Governance & Risk Thresholds**:
  - Automated hold triggers for expenses $\ge \$5,000$ (Manager review) and $\ge \$25,000$ (Dual Control).
  - Low-confidence categorization safety flags.
- **Tamper-Evident Immutable Audit Log**:
  - Blockchain-inspired SHA-256 cryptographic hash chaining for internal audit & compliance.
- **AI Financial Copilot (RAG Chat)**:
  - Grounded question answering on financial records and automated monthly executive reports.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Recharts, Lucide Icons, Glassmorphic CSS.
- **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite / PostgreSQL.
- **AI & Analytics**: Google Gemini 1.5/2.0 Flash API, NumPy, Pandas.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
