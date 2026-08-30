# RecoverOS AI

**Razorpay AI Buildathon 2026 — Track 03: AI Revenue Recovery**

RecoverOS AI is an enterprise-grade, autonomous revenue recovery platform designed to detect, diagnose, and rescue failed transactions without compromising customer trust or financial safety.

## The Problem

E-commerce and SaaS platforms bleed significant revenue daily due to "soft declines"—temporary issuer outages, authentication abandonment, network timeouts, or insufficient funds. 

Traditional retry mechanisms are blind. They blast the payment gateway with retries, which frustrates customers, risks triggering fraud flags, and incurs unnecessary gateway fees. Merchants are left with a massive reconciliation gap, where revenue at risk is permanently lost simply because the recovery workflow wasn't intelligent enough to diagnose the *reason* for the failure.

## The Architecture

RecoverOS AI transforms revenue recovery into a precise, highly-orchestrated lifecycle engineered for high availability and zero double-spending.

- **Fast-ACK Webhook Ingestion**: Razorpay webhooks are cryptographically verified and synchronously ingested into a `webhook_events` SQLite table. If a duplicate is detected via an atomic SQLite constraint, it drops the payload and ACKs the gateway. Valid events receive an immediate HTTP 200 Fast-ACK, decoupling the gateway from downstream asynchronous processing.
- **Isolated Execution Lifecycle**: Every failed transaction goes through a strict state machine: `RECEIVED` → `DIAGNOSED` → `POLICY_APPROVED` → `ACTION_EXECUTED` → `RECOVERED` / `RECONCILIATION_PENDING`. Execution is entirely decoupled from ingestion.
- **SQLite Idempotency Engine**: An atomic idempotency lock guarantees that no matter how many retries, duplicate webhooks, or network hiccups occur, a recovery action is executed exactly *once* per incident.

## AI & Deterministic Safety

RecoverOS utilizes Large Language Models where they excel (fuzzy classification and unstructured telemetry diagnosis) and shields them with deterministic code where absolute safety is required (financial transactions and policy limits).

- **Advisory AI Diagnosis**: Gemini analyzes the raw payment failure telemetry, customer tier, and historical data to diagnose the root cause (e.g., `TEMPORARY_ISSUER_OUTAGE`, `HIGH_RISK_FRAUD`). It outputs a structured recommendation (e.g., `SMART_RETRY_SCHEDULE`, `FALLBACK_UPI_PAYMENT_LINK`).
- **Deterministic Defense-in-Depth**: The AI **cannot** execute actions directly. All AI outputs are piped through a hardcoded, deterministic Policy Engine. This engine enforces non-negotiable financial constraints:
  - `MAX_RECOVERY_ATTEMPTS`: Prevents runaway retry loops.
  - `MIN_COOLDOWN_HOURS`: Ensures customers aren't spammed with payment links.
  - `MAX_INTERVENTION_COST`: Caps the monetary budget allocated to SMS/WhatsApp nudges or discount incentives.

## The Cryptographic Ledger

In a real-world fintech application, AI decisions must be auditable, explainable, and tamper-evident. 

RecoverOS AI maintains a continuous **SHA-256 Cryptographic Audit Ledger**. Every single state change—webhook ingestion, AI diagnosis, policy approval/denial, and gateway execution—is hashed against the `previous_hash` and committed to a local, append-only SQLite ledger. This ensures absolute regulatory compliance and allows merchants to trace exactly *why* the AI chose to execute a recovery action.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the Test Suite
Run the 100+ master reconciliation and safety test suite to verify the cryptographic ledger, idempotency engine, and deterministic policy constraints.
```bash
npm test
```

### 3. Launch the Demo
Boot up the RecoverOS Simulation environment, which spins up both the Express Backend (port 3001) and Vite React Frontend (port 3000) concurrently.
```bash
npm run dev
```
Open `http://localhost:3000` to interact with the RecoverOS Dashboard.
