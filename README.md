# RecoverOS
**Enterprise-Grade Payment Failure Orchestration**

RecoverOS is a deterministic recovery engine for the Razorpay ecosystem. It replaces brittle `if/else` webhook routing with a **Cognitive Diagnostic Layer** powered by Gemini 2.5 Flash, dynamically translating unstructured gateway errors into cryptographically secured, machine-actionable recovery protocols.

## Why RecoverOS Wins

### 1. Strictly Bounded AI Execution
LLMs should never execute financial transactions. RecoverOS physically bounds the Gemini 2.5 Flash model using the `@google/genai` strict `responseSchema` enums. The AI acts solely as a telemetry sensor—parsing raw webhook metadata to identify intent (e.g., `STOLEN_CARD_SIGNATURE` vs. `NETWORK_TIMEOUT`). If confidence drops below 85%, the system deterministically degrades to `ESCALATE_TO_HUMAN`. 

### 2. The Deterministic Policy Engine
While the AI provides semantic classification, 100% of execution authority remains in hard-coded Node.js logic. The engine enforces economic floors and velocity limits before any ledger write occurs, mathematically guaranteeing the AI cannot hallucinate a monetary action.

### 3. Cryptographic Audit Ledger
Traditional databases are vulnerable to internal state manipulation. RecoverOS implements a tamper-evident, append-only ledger using SQLite Write-Ahead Logging (WAL). Every state change hashes `previous_hash | incident_id | event_type | amount` via SHA-256. If a record is manually altered by a rogue admin, the cryptographic chain breaks instantly.

### 4. Real-Time Telemetry Streaming (SSE)
Built for live ops desks, the system abandons legacy HTTP polling for an event-driven Server-Sent Events (SSE) pipeline. AI reasoning traces and gateway failures stream to the frontend dashboard in milliseconds, entirely eliminating UI race conditions.

---

## Standard Routing vs. RecoverOS

| Feature | Legacy Webhook Architecture | RecoverOS |
| :--- | :--- | :--- |
| **Error Parsing** | Brittle regex and static mapping | Semantic Gemini normalization |
| **State Delivery** | Expensive `setInterval` polling | Zero-latency Server-Sent Events (SSE) |
| **Auditability** | Vulnerable to direct DB edits | SHA-256 immutable hash chain |
| **Execution** | Blindly auto-retries | Context-aware deterministic routing |

---

## The Tech Stack
* **AI Layer:** Google Gemini 2.5 Flash (Strict JSON Output Mode)
* **Payment Infrastructure:** Razorpay Node.js SDK & Webhooks
* **Backend:** Express.js, TypeScript, Server-Sent Events (SSE), Node Crypto
* **Database:** SQLite3 (Write-Ahead Logging enabled)
* **Frontend:** React, Tailwind CSS

---

## Local Demo Execution Guide

To evaluate the live AI reasoning stream on a local machine, RecoverOS includes a Bypass Bridge that routes frontend SDK failures directly into the backend SSE pipeline (bypassing the need for Ngrok tunneling).

**1. Environment Setup**
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=AQ.your_key_here
RAZORPAY_KEY_ID=rzp_test_your_key_here
RAZORPAY_KEY_SECRET=your_secret_here