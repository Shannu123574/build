# RecoverOS 🛡️

**Deterministic Revenue AI for Enterprise Merchants.**

Merchants bleed revenue during payment failures because gateway error codes are unstructured chaos. Static rule engines trap buyers in generic "try again" loops, often leading to cart abandonment—especially during UPI or bank PSP timeouts. 

**RecoverOS** solves this by utilizing Google's Gemini 2.5 Flash as a real-time semantic diagnostic sensor, paired with a strict, deterministic Node.js policy engine to instantly route failed payments across alternative financial rails.

---

## 🏗 Core Architecture & Pillars

We built RecoverOS to pass the compliance, security, and latency standards of an enterprise risk team:

*   **Bounded Cognitive Diagnosis:** We do not use AI to execute transactions. Gemini 2.5 Flash is strictly physically bounded using enforced JSON Enums and high-confidence floors. It translates unstructured gateway chaos into clean, actionable telemetry.
*   **Deterministic Execution Engine:** Once the AI normalizes the error intent (e.g., `NPCI_PSP_TIMEOUT`), our Node.js deterministic policy engine retains 100% of execution authority, ensuring zero hallucination risk in the financial flow.
*   **Smart Cross-Rail Fallback:** If a customer's UPI bank server goes down, RecoverOS automatically suppresses the broken rail and instantly dispatches an SMS/WhatsApp fallback link, shifting the transaction to a Credit Card or Wallet to save the sale.
*   **Cryptographic Ledgering:** Every failure, AI diagnosis, and recovery action is hashed sequentially via SHA-256 into a secure Write-Ahead Log (WAL). A rogue admin cannot alter a recovered transaction without breaking the cryptographic chain.

---

## 💻 Tech Stack

*   **Frontend:** React.js, Tailwind CSS
*   **Backend Policy Engine:** Node.js, Express
*   **AI/Cognitive Sensor:** Google Gemini 2.5 Flash (via `@google/genai`)
*   **Database & Forensics:** SQLite with SHA-256 hashing
*   **Real-time Telemetry:** Server-Sent Events (SSE)
*   **Payment Infrastructure:** Razorpay Standard Checkout (`checkout.js`) with Native UPI/QR

---

## 📊 Dashboard Modules

1.  **Operations Desk:** A live SSE-streamed terminal tracking payment webhooks, AI reasoning traces, and a real-time Recovery Queue displaying saved revenue.
2.  **Case Forensics:** A cryptographic audit UI showcasing immutable SHA-256 hash chains for all recovered transactions to ensure absolute ledger integrity.
3.  **Agent Activity:** Real-time telemetry monitoring Gemini's latency, token burn, confidence scoring thresholds, and schema validation blocks.
4.  **Analytics & Yield:** System-wide KPI generation mapping net recovery yield, cross-rail fallback distribution, and automated vs. manual escalation rates.

---

## 🚀 Local Setup & Installation

**1. Clone the repository**
```bash
git clone [https://github.com/your-username/recoveros.git](https://github.com/your-username/recoveros.git)
cd recoveros