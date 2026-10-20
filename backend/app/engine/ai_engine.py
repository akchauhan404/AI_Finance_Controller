import os
import json
import re
from datetime import datetime
from typing import Dict, Any, List, Optional

import requests
from sqlalchemy.orm import Session

from app.db import models
from app.engine.analytics import AnalyticsEngine
from app.engine.governance import GovernanceEngine


DEFAULT_CATEGORIES = [
    "Cloud Infrastructure & Hosting",
    "Software & Subscriptions",
    "Payroll & Compensation",
    "Legal & Professional Services",
    "Marketing & Advertising",
    "Travel & Entertainment",
    "Office Supplies & Facilities",
    "Merchant & Banking Fees",
    "Revenue / Client Payment",
    "Uncategorized",
]


class AIEngine:
    """
    LLM-based Reasoning & Narrative Engine with Google Gemini / Gemma integration.

    Strict Design Principle:
    LLM explains and classifies.
    It NEVER performs financial mathematics.

    All financial metrics passed to the LLM are pre-calculated
    by AnalyticsEngine.
    """

    @staticmethod
    def call_gemini(
        prompt: str,
        api_key: Optional[str] = None
    ) -> Optional[str]:
        """
        Helper method to call Google Gemini / Gemma API.

        Tries currently configured candidate models in order.
        Returns only the generated text.
        """

        key = api_key or os.getenv("GEMINI_API_KEY", "")

        if not key:
            return None

        candidate_models = [
            "models/gemma-4-26b-a4b-it",
            "models/gemini-2.5-flash",
            "models/gemini-2.0-flash",
            "models/gemini-1.5-flash",
        ]

        headers = {
            "Content-Type": "application/json"
        }

        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 1000,
            },
        }

        for model_name in candidate_models:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/"
                f"{model_name}:generateContent?key={key}"
            )

            try:
                res = requests.post(
                    url,
                    headers=headers,
                    json=payload,
                    timeout=3
                )

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])

                    if candidates:
                        parts = (
                            candidates[0]
                            .get("content", {})
                            .get("parts", [])
                        )

                        if parts:
                            text = parts[0].get("text", "").strip()

                            if text:
                                return text

            except Exception as e:
                print(
                    f"Gemini API Exception for model {model_name}:",
                    e
                )

        return None

    @staticmethod
    def categorize_transaction(
        db: Session,
        description: str,
        amount: float,
        vendor_name: str = "",
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Classifies transaction description into a GL Category.

        Gemini is used when available.
        Otherwise deterministic pattern matching is used.

        Financial arithmetic is never delegated to the LLM.
        """

        model_used = "deterministic-rule-engine"
        category = "Uncategorized"
        confidence = 0.70
        reasoning = f"Pattern matching for '{description}'"

        gemini_prompt = f"""You are a certified AI Financial Controller.
Categorize the following ledger transaction into ONE of these allowed categories:

Allowed Categories:
{', '.join(DEFAULT_CATEGORIES)}

Transaction Details:
Description: "{description}"
Vendor: "{vendor_name}"
Amount: ${amount:,.2f}

Respond ONLY in valid JSON format:
{{"category": "Category Name", "confidence": 0.95, "reasoning": "Short 1-sentence reason"}}
"""

        gemini_res = AIEngine.call_gemini(
            gemini_prompt,
            api_key=api_key
        )

        if gemini_res:
            try:
                clean_json = re.sub(
                    r"```json\s*|\s*```",
                    "",
                    gemini_res
                ).strip()

                parsed = json.loads(clean_json)

                parsed_category = parsed.get("category")

                if parsed_category in DEFAULT_CATEGORIES:
                    category = parsed_category

                    try:
                        confidence = float(
                            parsed.get("confidence", 0.95)
                        )
                    except (TypeError, ValueError):
                        confidence = 0.95

                    confidence = max(
                        0.0,
                        min(1.0, confidence)
                    )

                    reasoning = parsed.get(
                        "reasoning",
                        "Categorized by Gemini/Gemma"
                    )

                    model_used = "gemini/gemma"

            except Exception as err:
                print(
                    "Failed to parse Gemini JSON:",
                    err
                )

        # Deterministic fallback when LLM classification
        # is unavailable or invalid.
        if model_used == "deterministic-rule-engine":
            desc_lower = (
                description + " " + vendor_name
            ).lower()

            if any(
                k in desc_lower
                for k in [
                    "aws",
                    "amazon web services",
                    "cloud",
                    "azure",
                    "gcp",
                    "digitalocean",
                    "datadog",
                    "snowflake",
                ]
            ):
                category = "Cloud Infrastructure & Hosting"
                confidence = 0.96

            elif any(
                k in desc_lower
                for k in [
                    "slack",
                    "github",
                    "zoom",
                    "notion",
                    "figma",
                    "salesforce",
                    "jira",
                    "google workspace",
                    "hubspot",
                ]
            ):
                category = "Software & Subscriptions"
                confidence = 0.95

            elif any(
                k in desc_lower
                for k in [
                    "payroll",
                    "gusto",
                    "rippling",
                    "salary",
                    "w2",
                    "stipend",
                    "bonus",
                ]
            ):
                category = "Payroll & Compensation"
                confidence = 0.98

            elif any(
                k in desc_lower
                for k in [
                    "legal",
                    "law",
                    "attorney",
                    "cpa",
                    "audit",
                    "deloitte",
                    "pwc",
                    "consulting",
                    "cooley",
                ]
            ):
                category = "Legal & Professional Services"
                confidence = 0.92

            elif any(
                k in desc_lower
                for k in [
                    "google ads",
                    "meta ads",
                    "facebook",
                    "linkedin ads",
                    "billboard",
                    "pr agency",
                ]
            ):
                category = "Marketing & Advertising"
                confidence = 0.93

            elif any(
                k in desc_lower
                for k in [
                    "uber",
                    "lyft",
                    "airline",
                    "delta",
                    "hotel",
                    "airbnb",
                    "doordash",
                    "restaurant",
                ]
            ):
                category = "Travel & Entertainment"
                confidence = 0.89

            elif any(
                k in desc_lower
                for k in [
                    "wework",
                    "office depot",
                    "staples",
                    "rent",
                    "utilities",
                    "janitorial",
                ]
            ):
                category = "Office Supplies & Facilities"
                confidence = 0.91

            elif any(
                k in desc_lower
                for k in [
                    "wire fee",
                    "stripe fee",
                    "bank fee",
                    "interest",
                    "finance charge",
                ]
            ):
                category = "Merchant & Banking Fees"
                confidence = 0.97

            elif (
                amount > 0
                or any(
                    k in desc_lower
                    for k in [
                        "client payment",
                        "invoice payment",
                        "stripe deposit",
                        "acme corp payment",
                    ]
                )
            ):
                category = "Revenue / Client Payment"
                confidence = 0.98

        GovernanceEngine.log_ai_action(
            db=db,
            action_type="categorize",
            input_ref=(
                f"description:'{description}',"
                f"amount:{amount}"
            ),
            output=json.dumps(
                {
                    "assigned_category": category,
                    "confidence": confidence,
                    "reasoning": reasoning,
                }
            ),
            confidence_score=confidence,
            model_used=model_used,
            human_reviewed=False,
        )

        return {
            "category": category,
            "confidence": confidence,
            "reasoning": reasoning,
            "model_used": model_used,
        }

    @staticmethod
    def generate_narrative_insights(
        db: Session,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates natural-language executive financial insights
        from precomputed statistics.

        The LLM never calculates financial metrics.
        """

        tx_count = db.query(models.Transaction).count()

        runway_info = (
            AnalyticsEngine.calculate_runway_and_burn(db)
        )

        variances = (
            AnalyticsEngine.calculate_category_variances(db)
        )

        anomalies = (
            AnalyticsEngine.detect_anomalies(db)
        )

        total_bal = runway_info["total_balance"]
        burn = runway_info["net_burn_rate"]
        runway = runway_info["runway_months"]

        over_budget_cats = [
            v for v in variances
            if v["over_budget"]
        ]

        anomaly_count = len(anomalies)

        model_used = "deterministic-rules-engine"

        if tx_count == 0:
            narrative_text = (
                "**Executive Summary:** Ledger dataset is empty. "
                "No transaction activity is currently available "
                "for financial analysis.\n\n"

                "**Budget Variances:** Zero spending transactions "
                "recorded. Upload a CSV statement to run "
                "transaction-based category variance analysis.\n\n"

                "**Risk & Anomaly Alert:** No transactions are "
                "currently available for anomaly detection. "
                "The system is ready to analyze imported ledger data."
            )

        else:
            runway_text = (
                f"{runway} Months"
                if runway is not None
                else "Not constrained by current net burn"
            )

            gemini_prompt = f"""You are the Lead Financial Controller
synthesizing an Executive Monthly Financial Insight summary for the CFO.

Strict Rule:
Use ONLY the provided numbers below.
Do NOT perform any arithmetic calculations.

Precomputed Ledger Statistics:
- Total Ingested Transactions: {tx_count}
- Total Liquid Cash Balance: ${total_bal:,.2f}
- Monthly Net Burn Rate: ${burn:,.2f}
- Operating Runway Coverage: {runway_text}
- Over Budget Spending Categories: {len(over_budget_cats)} categories
- Flagged Anomalies Count: {anomaly_count} items

Write a concise 3-paragraph executive narrative with bold headers:
**Executive Summary**
**Budget Variances**
**Risk & Anomaly Alert**
"""

            narrative_text = AIEngine.call_gemini(
                gemini_prompt,
                api_key=api_key
            )

            if (
                narrative_text
                and len(narrative_text.strip()) > 20
            ):
                model_used = "gemini/gemma"

            else:
                model_used = "deterministic-synthesizer"

                summary_paragraphs = [
                    (
                        f"**Executive Summary:** Analyzed "
                        f"**{tx_count} ledger transactions**. "
                        f"Liquid cash balance stands at "
                        f"**${total_bal:,.2f}** with a monthly net "
                        f"burn rate of **${burn:,.2f}**, with "
                        f"**{f'{runway} months of operating runway coverage' if runway is not None else 'no current net-burn constraint'}** "
                        f"based on the last 30 days of ledger activity."
                    ),
                    (
                        f"**Budget Variances:** "
                        f"{len(over_budget_cats)} spending categories "
                        f"exceeded monthly budget allocations."
                        + (
                            f" Notably, "
                            f"**{over_budget_cats[0]['category_name']}** "
                            f"recorded "
                            f"**${over_budget_cats[0]['actual']:,.2f}** "
                            f"spend against a "
                            f"**${over_budget_cats[0]['budget']:,.2f}** "
                            f"budget "
                            f"({over_budget_cats[0]['pct_variance']:+.1f}% variance)."
                            if over_budget_cats
                            else
                            " All active spending categories remain "
                            "within target monthly budget limits."
                        )
                    ),
                    (
                        f"**Risk & Anomaly Alert:** "
                        f"The automated rules engine flagged "
                        f"**{anomaly_count} items** requiring "
                        f"controller review."
                        if anomaly_count > 0
                        else
                        "**Risk & Anomaly Alert:** "
                        "Zero high-severity financial anomalies "
                        "detected across recent transactions."
                    ),
                ]

                narrative_text = "\n\n".join(
                    summary_paragraphs
                )

        GovernanceEngine.log_ai_action(
            db=db,
            action_type="insight",
            input_ref=f"dashboard_stats_tx_count:{tx_count}",
            output=narrative_text,
            confidence_score=0.98,
            model_used=model_used,
        )

        return {
            "insights_markdown": narrative_text,
            "generated_at": datetime.utcnow().isoformat(),
            "model_used": model_used,
            "precomputed_stats": {
                "tx_count": tx_count,
                "runway_months": runway,
                "monthly_burn": burn,
                "over_budget_count": len(over_budget_cats),
                "anomaly_count": anomaly_count,
            },
        }

    @staticmethod
    def answer_financial_query(
        db: Session,
        query: str,
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieval-Augmented Chat (RAG).

        Step 1:
        Retrieve relevant deterministic SQL/database context.

        Step 2:
        Give that context to Gemini/Gemma for natural-language
        explanation.

        The LLM is instructed not to calculate new financial values.
        """

        query_lower = query.lower()
        context_items = []

        if any(
            k in query_lower
            for k in [
                "runway",
                "cash",
                "balance",
                "burn",
            ]
        ):
            runway_data = (
                AnalyticsEngine.calculate_runway_and_burn(db)
            )

            runway_value = runway_data["runway_months"]

            runway_text = (
                f"{runway_value} months"
                if runway_value is not None
                else "Not constrained by current net burn"
            )

            context_items.append(
                f"Account Balance: "
                f"${runway_data['total_balance']:,.2f}, "
                f"Monthly Net Burn: "
                f"${runway_data['net_burn_rate']:,.2f}, "
                f"Runway: {runway_text}"
            )

        if any(
            k in query_lower
            for k in [
                "vendor",
                "aws",
                "slack",
                "salesforce",
                "wework",
                "spend",
            ]
        ):
            txs = (
                db.query(models.Transaction)
                .order_by(
                    models.Transaction.amount.asc()
                )
                .limit(10)
                .all()
            )

            top_tx_str = ", ".join(
                [
                    (
                        f"{t.description}: "
                        f"${abs(t.amount):,.2f} "
                        f"({t.date.strftime('%Y-%m-%d')})"
                    )
                    for t in txs
                ]
            )

            if top_tx_str:
                context_items.append(
                    f"Recent major transactions: {top_tx_str}"
                )
            else:
                context_items.append(
                    "Recent major transactions: "
                    "No transaction records available."
                )

        if any(
            k in query_lower
            for k in [
                "anomaly",
                "flagged",
                "review",
                "alert",
                "duplicate",
            ]
        ):
            anomalies = (
                AnalyticsEngine.detect_anomalies(db)
            )

            if anomalies:
                anomaly_text = "; ".join(
                    [
                        a["message"]
                        for a in anomalies[:3]
                    ]
                )
            else:
                anomaly_text = (
                    "No active anomalies detected."
                )

            context_items.append(
                f"Active Anomalies ({len(anomalies)}): "
                f"{anomaly_text}"
            )

        if any(
            k in query_lower
            for k in [
                "invoice",
                "overdue",
                "pending",
            ]
        ):
            invoices = (
                db.query(models.Invoice)
                .all()
            )

            if invoices:
                inv_str = ", ".join(
                    [
                        (
                            f"Invoice #{i.id} "
                            f"(${i.amount:,.2f}, "
                            f"Status: {i.status})"
                        )
                        for i in invoices[:5]
                    ]
                )
            else:
                inv_str = (
                    "No invoice records available."
                )

            context_items.append(
                f"Invoice records: {inv_str}"
            )

        if not context_items:
            runway_data = (
                AnalyticsEngine.calculate_runway_and_burn(db)
            )

            tx_count = (
                db.query(models.Transaction).count()
            )

            context_items.append(
                f"General Ledger Summary: "
                f"{tx_count} transactions recorded. "
                f"Current cash balance is "
                f"${runway_data['total_balance']:,.2f}."
            )

        formatted_context = "\n- ".join(
            context_items
        )

        gemini_prompt = f"""You are an AI Financial Controller Assistant
answering a user's question.

Strict Rules:
1. Answer ONLY using the SQL database context provided below.
2. Do NOT invent financial values.
3. Do NOT introduce numbers that are not present in the retrieved context.
4. Do NOT perform new financial calculations.
5. If the retrieved context does not contain enough information,
   clearly say that the required data is not available.

User Question:
"{query}"

Retrieved SQL Ledger Context:
- {formatted_context}

Format your answer with clear markdown bullet points and refer
directly to the retrieved facts.
"""

        answer = AIEngine.call_gemini(
            gemini_prompt,
            api_key=api_key
        )

        if answer:
            model_used = "gemini/gemma"

        else:
            model_used = "deterministic-chat-fallback"

            answer = (
                "Based on real-time ledger data retrieved "
                "from the database:\n\n"
            )

            if (
                "runway" in query_lower
                or "cash" in query_lower
            ):
                runway_data = (
                    AnalyticsEngine
                    .calculate_runway_and_burn(db)
                )

                if runway_data["runway_months"] is None:
                    answer += (
                        f"• **Cash & Runway:** You currently "
                        f"have **${runway_data['total_balance']:,.2f}** "
                        f"in total liquid cash reserves. "
                        f"Current income covers expenses, so "
                        f"there is no net-burn runway constraint.\n"
                    )
                else:
                    answer += (
                        f"• **Cash & Runway:** You currently "
                        f"have **${runway_data['total_balance']:,.2f}** "
                        f"in total liquid cash reserves, "
                        f"providing "
                        f"**{runway_data['runway_months']} months** "
                        f"of operating runway based on the "
                        f"current net burn.\n"
                    )

            elif "transaction" in query_lower or "ledger" in query_lower:
                tx_count = (
                    db.query(models.Transaction).count()
                )

                answer += (
                    f"• **Ledger Activity:** The database "
                    f"currently contains **{tx_count} "
                    f"transactions**.\n"
                )

            elif "approval" in query_lower:
                pending_approvals = (
                    db.query(models.Approval)
                    .filter(
                        models.Approval.status == "pending"
                    )
                    .count()
                )

                answer += (
                    f"• **Pending Approvals:** There are "
                    f"currently **{pending_approvals} "
                    f"approvals** awaiting review.\n"
                )

            elif "alert" in query_lower:
                active_alerts = (
                    db.query(models.Alert)
                    .filter(
                        models.Alert.acknowledged == False
                    )
                    .count()
                )

                answer += (
                    f"• **Active Alerts:** There are "
                    f"currently **{active_alerts} "
                    f"unacknowledged alerts**.\n"
                )

            else:
                answer += (
                    "• The available database context does "
                    "not contain enough information to answer "
                    "this question reliably.\n"
                )

        GovernanceEngine.log_ai_action(
            db=db,
            action_type="chat",
            input_ref=f"query:'{query}'",
            output=answer,
            confidence_score=0.96,
            model_used=model_used,
        )

        return {
            "query": query,
            "answer": answer,
            "retrieved_context": context_items,
            "model_used": model_used,
        }

    @staticmethod
    def generate_ai_report(
        db: Session,
        report_type: str = "monthly_summary",
        api_key: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generates a structured financial report using deterministic
        statistics.

        The report never fabricates financial values.

        When there are no transactions, transaction-based forecasting
        and analysis are explicitly marked as unavailable.
        """

        tx_count = (
            db.query(models.Transaction).count()
        )

        runway_info = (
            AnalyticsEngine.calculate_runway_and_burn(db)
        )

        variances = (
            AnalyticsEngine.calculate_category_variances(db)
        )

        anomalies = (
            AnalyticsEngine.detect_anomalies(db)
        )

        report_title = (
            f"AI Financial Controller — "
            f"{report_type.replace('_', ' ').title()} Report"
        )

        if tx_count == 0:

            report_md = f"""# {report_title}
*Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')} | Status: Empty Ledger*

---

## 1. Executive Summary

- **Current Total Cash Balance:** ${runway_info['total_balance']:,.2f}
- **Monthly Gross Expenses:** $0.00
- **Monthly Revenue / Inflows:** $0.00
- **Net Monthly Burn Rate:** $0.00
- **Total Ledger Transactions:** 0

*Notice: No transaction records currently exist in the database. No transaction activity is currently available for financial analysis. The current account balance shown above is based on the account balance stored in the database. Upload a CSV bank statement in the Ingestion tab to run transaction-based financial analytics.*

---

## 2. Budget vs. Actual Variance Analysis

| Category Name | Target Monthly Budget | Actual 30-Day Spend | Variance ($) | Variance (%) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""

            categories = (
                db.query(models.Category)
                .all()
            )

            for c in categories:
                report_md += (
                    f"| {c.name} | "
                    f"${c.budget_monthly:,.2f} | "
                    f"$0.00 | "
                    f"-${c.budget_monthly:,.2f} | "
                    f"0.0% | "
                    f"NO SPEND |\n"
                )

            report_md += """
---

## 3. 30-Day Cash Flow Forecast

- **30-Day Forecast:** Not available because no transaction history exists.
- **Forecast Confidence:** Not available without historical transaction activity.
- **Methodology:** No forecast is generated until transaction data is available.

---

## 4. Governance & Anomaly Audit

- **Total Flagged Anomalies:** 0 items
- **Analysis Status:** No transaction records are available for anomaly analysis.

---

## 5. Data Status

- **Transaction Records:** 0
- **Transaction-Based Analysis:** Not available
- **Account Balance:** Based on the balance stored for the account
- **Forecast:** Not available
- **Anomaly Detection:** Not available

---

*Audit Attestation: The report contains only database-backed account and configuration data. Transaction-based financial intelligence will be generated after ledger data is imported.*
"""

            model_used = "deterministic-report-engine"

        else:

            over_budget_cats = [
                v for v in variances
                if v["over_budget"]
            ]

            forecasts = (
                AnalyticsEngine.generate_cashflow_forecast(
                    db,
                    days_ahead=30
                )
            )

            runway_text = (
                f"{runway_info['runway_months']} Months"
                if runway_info["runway_months"] is not None
                else "Not constrained by current net burn"
            )

            report_md = f"""# {report_title}
*Generated on {datetime.utcnow().strftime('%B %d, %Y at %H:%M UTC')} | Model: Gemini/Gemma*

---

## 1. Executive Summary

- **Current Total Cash Balance:** ${runway_info['total_balance']:,.2f}
- **Monthly Gross Expenses:** ${runway_info['monthly_expenses']:,.2f}
- **Monthly Revenue / Inflows:** ${runway_info['monthly_income']:,.2f}
- **Net Monthly Burn Rate:** ${runway_info['net_burn_rate']:,.2f}
- **Estimated Operating Runway:** **{runway_text}**
- **Total Ledger Transactions:** {tx_count}

Analyzed **{tx_count} ledger transactions**. The company maintains an operating cash balance of **${runway_info['total_balance']:,.2f}** with **{len(over_budget_cats)} categories** currently over budget and **{len(anomalies)} flagged anomaly items**.

---

## 2. Budget vs. Actual Variance Analysis

| Category Name | Target Monthly Budget | Actual 30-Day Spend | Variance ($) | Variance (%) | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
"""

            for v in variances:

                status_badge = (
                    "OVER BUDGET"
                    if v["over_budget"]
                    else "WITHIN BUDGET"
                )

                report_md += (
                    f"| {v['category_name']} | "
                    f"${v['budget']:,.2f} | "
                    f"${v['actual']:,.2f} | "
                    f"{v['variance']:+,.2f} | "
                    f"{v['pct_variance']:+.1f}% | "
                    f"{status_badge} |\n"
                )

            if forecasts:
                final_forecast = forecasts[-1]

                report_md += f"""
---

## 3. 30-Day Cash Flow Forecast

- **Expected 30-Day End Balance:** ${final_forecast['predicted_balance']:,.2f}
- **Confidence Interval (95%):** [${final_forecast['lower_bound']:,.2f} to ${final_forecast['upper_bound']:,.2f}]
- **Methodology:** Time-series moving average + linear trend regression on historical ledger velocity.

"""
            else:
                report_md += """
---

## 3. 30-Day Cash Flow Forecast

- **30-Day Forecast:** Not available from the current transaction history.
- **Forecast Confidence:** Not available.
- **Methodology:** Forecast requires sufficient historical ledger activity.

"""

            report_md += f"""---

## 4. Governance & Anomaly Audit

- **Total Flagged Anomalies:** {len(anomalies)} items
"""

            for a in anomalies:
                report_md += (
                    f"- **[{a['severity'].upper()}] "
                    f"Transaction #{a['transaction_id']}:** "
                    f"{a['message']}\n"
                )

            report_md += """
---

*Audit Attestation: All underlying financial numbers in this report were computed deterministically by the Rules Engine. AI is used for narrative interpretation and classification and is not used to perform financial arithmetic.*
"""

            model_used = "deterministic-report-engine"

        GovernanceEngine.log_ai_action(
            db=db,
            action_type="report",
            input_ref=f"report_type:{report_type}",
            output=report_md,
            confidence_score=1.0,
            model_used=model_used,
        )

        return {
            "title": report_title,
            "report_markdown": report_md,
            "created_at": datetime.utcnow().isoformat(),
            "model_used": model_used,
        }