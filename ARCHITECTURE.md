# RecoverOS AI — System Architecture & Technical Specifications

## Architectural Pillars

### 1. Ingestion & Normalization Layer
- **Interface**: Razorpay HMAC-SHA256 authenticated webhook receiver.
- **Normalization**: Translates raw webhook payloads into canonical `NormalizedPaymentEvent` structures.
- **Idempotency**: In-memory and persistent SHA-256 deduplication cache prevents double-execution.

### 2. Diagnostic Intelligence Layer
- **Model**: Gemini 2.5 Flash (`@google/genai` TypeScript SDK) with strict structured JSON schema output.
- **Resilience**: Integrated with `classifyPaymentFailureFallback` fallback classifier when offline or timeout occurs.
- **Bounds Clamping**: All probability outputs are mathematically clamped into the range `[0.0, 1.0]`.

### 3. Deterministic Policy Gate (The Institutional Shield)
- **Design Pattern**: Default-to-DENY Policy Gate.
- **Sequential Hurdle Evaluation**:
  1. Action Whitelist (TypeScript Enum `RecoveryAction`).
  2. Max 3 Retries Limit.
  3. Cooldown Guard (Minimum 120 minutes).
  4. Fraud Score Hurdle (Hard block if risk > 0.65).
  5. Positive Net ROI Gate ($E[\text{Gain}] = P_{\text{recovery}} \times \text{Amount} - \text{Cost}_{\text{intervention}} - \text{Cost}_{\text{fatigue}} > 0$).
  6. Merchant Daily Budget Cap Check.

### 4. Gateway Execution Abstraction
- **Adapter Interface**: `PaymentGatewayAdapter` decoupling business logic from payment rail SDKs.
- **Sandbox Adapter**: `RazorpaySandboxAdapter` (active) executing deterministic physics rolls (Seed 42).
- **Production Guard**: `ProductionRazorpayAdapter` throwing guarded safety exceptions to guarantee zero accidental real-money movement during demonstrations.

### 5. Dual-Entry Cryptographic Audit Ledger
- **Hashing**: SHA-256 block chain where each record stores `previousHash` and `currentHash`.
- **Integrity**: `computeRecordHash` and `verifyIntegrity` continuously validate blockchain continuity.
- **Dual-Entry Accounting**: Debit at risk, credit recovered, and operational cost tracked on every transaction.
