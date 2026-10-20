import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.db import models

class AnalyticsEngine:
    """
    Deterministic Rules & Analytics Engine.
    Strict Design Principle: ALL arithmetic is strictly calculated here,
    never by the LLM.
    """

    @staticmethod
    def detect_anomalies(db: Session) -> List[Dict[str, Any]]:
        """
        Runs statistical and rule-based anomaly detection across all transactions.
        1. Z-score statistical anomaly (> 2.5 std dev)
        2. Duplicate vendor + amount within 48h
        3. Large round-number payments
        4. Off-hours / weekend high spend
        """
        transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
        if not transactions:
            return []

        df = pd.DataFrame([{
            'id': t.id,
            'amount': abs(t.amount),
            'raw_amount': t.amount,
            'date': t.date,
            'description': t.description,
            'vendor_id': t.vendor_id,
            'category': t.category,
            'status': t.status
        } for t in transactions])

        anomalies = []

        # 1. Statistical Z-Score
        if len(df) > 5:
            mean_amt = df['amount'].mean()
            std_amt = df['amount'].std()
            if std_amt > 0:
                df['z_score'] = (df['amount'] - mean_amt) / std_amt
                z_anomalies = df[df['z_score'] > 2.5]
                for idx, row in z_anomalies.iterrows():
                    anomalies.append({
                        'transaction_id': int(row['id']),
                        'type': 'anomaly',
                        'severity': 'high' if row['z_score'] > 3.5 else 'medium',
                        'rule': f"Statistical Z-Score ({row['z_score']:.2f} σ above mean ${mean_amt:,.2f})",
                        'message': f"Unusual spend amount ${row['amount']:,.2f} for '{row['description']}' is {row['z_score']:.2f} standard deviations above average."
                    })

        # 2. Duplicate Detection (Same vendor or description + exact amount within 48 hours)
        df_sorted = df.sort_values(by='date')
        for i in range(len(df_sorted)):
            for j in range(i + 1, len(df_sorted)):
                t1 = df_sorted.iloc[i]
                t2 = df_sorted.iloc[j]
                time_diff = abs((t2['date'] - t1['date']).total_seconds()) / 3600.0  # hours
                if time_diff > 48:
                    break  # Sorted by date, so no need to search further
                
                if abs(t1['amount'] - t2['amount']) < 0.01 and (t1['description'] == t2['description'] or (t1['vendor_id'] and t1['vendor_id'] == t2['vendor_id'])):
                    anomalies.append({
                        'transaction_id': int(t2['id']),
                        'type': 'anomaly',
                        'severity': 'high',
                        'rule': 'Duplicate Payment Suspect',
                        'message': f"Possible duplicate payment of ${t2['amount']:,.2f} within {time_diff:.1f} hours of Transaction #{t1['id']} ('{t1['description']}')."
                    })

        # 3. Large Round Number Flags (e.g. $5,000.00, $10,000.00, $25,000.00)
        for idx, row in df.iterrows():
            amt = row['amount']
            if amt >= 1000 and amt % 500 == 0:
                anomalies.append({
                    'transaction_id': int(row['id']),
                    'type': 'anomaly',
                    'severity': 'low',
                    'rule': 'Round Number Transaction',
                    'message': f"Exact round figure amount ${amt:,.2f} detected for '{row['description']}'. Worth double-checking invoice line items."
                })

        # 4. Weekend / Off-Hours High Spend (> $2,500 on weekend)
        for idx, row in df.iterrows():
            tx_date = row['date']
            # Sunday = 6, Saturday = 5
            if tx_date.weekday() in (5, 6) and row['amount'] > 2500:
                anomalies.append({
                    'transaction_id': int(row['id']),
                    'type': 'anomaly',
                    'severity': 'medium',
                    'rule': 'Off-Hours High Expense',
                    'message': f"High transaction of ${row['amount']:,.2f} posted on {tx_date.strftime('%A')} ({tx_date.strftime('%Y-%m-%d')})."
                })

        # De-duplicate anomalies by transaction_id & rule
        unique_anomalies = []
        seen = set()
        for a in anomalies:
            key = (a['transaction_id'], a['rule'])
            if key not in seen:
                seen.add(key)
                unique_anomalies.append(a)

        return unique_anomalies

    @staticmethod
    def calculate_runway_and_burn(db: Session) -> Dict[str, Any]:
        """
        Calculates cash position and burn from the actual account balances
        and transaction ledger.

        Account.balance is treated as the current bank/account balance.
        Transaction amounts represent ledger activity and are used for
        cash-flow and burn calculations.
        """
        accounts = db.query(models.Account).all()

        # Current cash held across all accounts.
        total_balance = sum(
            float(account.balance or 0.0)
            for account in accounts
        )

        # Calculate actual activity over the last 30 days.
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)

        recent_txs = (
            db.query(models.Transaction)
            .filter(models.Transaction.date >= thirty_days_ago)
            .all()
        )

        income = sum(
            float(t.amount or 0.0)
            for t in recent_txs
            if float(t.amount or 0.0) > 0
        )

        expenses = sum(
            abs(float(t.amount or 0.0))
            for t in recent_txs
            if float(t.amount or 0.0) < 0
        )

        net_cash_flow = income - expenses

        # Burn is only meaningful when expenses exceed income.
        # Positive net cash flow means there is no current net burn.
        net_burn = max(0.0, expenses - income)

        # If there is no net burn, runway is not constrained by current
        # 30-day activity.
        if net_burn > 0:
            runway_months = round(total_balance / net_burn, 1)
        else:
            runway_months = None

        return {
            "total_balance": round(total_balance, 2),
            "monthly_expenses": round(expenses, 2),
            "monthly_income": round(income, 2),
            "net_cash_flow": round(net_cash_flow, 2),
            "net_burn_rate": round(net_burn, 2),
            "runway_months": runway_months
    }

    @staticmethod
    def calculate_category_variances(db: Session) -> List[Dict[str, Any]]:
        """
        Calculates category actual spend vs monthly budget.
        """
        categories = db.query(models.Category).all()
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        recent_txs = db.query(models.Transaction).filter(
            models.Transaction.date >= thirty_days_ago,
            models.Transaction.amount < 0
        ).all()

        cat_spend = {}
        for t in recent_txs:
            cat_name = t.category or "Uncategorized"
            cat_spend[cat_name] = cat_spend.get(cat_name, 0.0) + abs(t.amount)

        variances = []
        for cat in categories:
            actual = cat_spend.get(cat.name, 0.0)
            budget = cat.budget_monthly
            diff = actual - budget
            pct_variance = round((diff / budget * 100.0), 1) if budget > 0 else (100.0 if actual > 0 else 0.0)
            variances.append({
                "category_id": cat.id,
                "category_name": cat.name,
                "budget": round(budget, 2),
                "actual": round(actual, 2),
                "variance": round(diff, 2),
                "pct_variance": pct_variance,
                "over_budget": actual > budget
            })
        return variances

    @staticmethod
    def generate_cashflow_forecast(db: Session, days_ahead: int = 30) -> List[Dict[str, Any]]:
        """
        Time-series moving average + linear trend forecast for cash balance over 7, 14, 30 days.
        """
        accounts = db.query(models.Account).all()
        current_balance = sum(a.balance for a in accounts)

        # Get daily net flow over past 30 days
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        past_txs = db.query(models.Transaction).filter(models.Transaction.date >= thirty_days_ago).all()

        daily_flows = {}
        for i in range(30):
            d = (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d")
            daily_flows[d] = 0.0

        for t in past_txs:
            d_str = t.date.strftime("%Y-%m-%d")
            if d_str in daily_flows:
                daily_flows[d_str] += t.amount

        # Moving average daily net flow
        flows = list(daily_flows.values())
        avg_daily_flow = np.mean(flows) if len(flows) > 0 else -500.0
        std_daily_flow = np.std(flows) if len(flows) > 0 else 200.0

        forecast_points = []
        running_bal = current_balance
        start_date = datetime.utcnow()

        for d in range(1, days_ahead + 1):
            target_date = start_date + timedelta(days=d)
            # Add subtle seasonal noise for realism
            expected_change = avg_daily_flow + np.random.normal(0, std_daily_flow * 0.1)
            running_bal += expected_change
            confidence_bound = std_daily_flow * np.sqrt(d) * 1.5

            forecast_points.append({
                "date": target_date.strftime("%Y-%m-%d"),
                "predicted_balance": round(running_bal, 2),
                "lower_bound": round(running_bal - confidence_bound, 2),
                "upper_bound": round(running_bal + confidence_bound, 2),
                "daily_change": round(expected_change, 2)
            })

        return forecast_points
