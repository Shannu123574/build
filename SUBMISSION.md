# Razorpay AI Buildathon — SUBMISSION DOCUMENT
## Track 03: AI Revenue Recovery

### 1. What real-world problem exists?
Payment failures and checkout abandonments occur constantly due to network timeouts, insufficient funds, authentication drop-offs, and expired instruments, leading to massive involuntary churn.

### 2. Who loses money?
Merchants lose direct product revenue, recurring subscription lifetime value (LTV), and incur unnecessary gateway retry fees. Customers lose access to their services.

### 3. Why existing recovery systems are insufficient?
Static dunning systems attempt blind, schedule-based retries (e.g., retrying every 3 days) without understanding *why* the payment failed, angering customers and wasting API calls on terminal failures (like expired cards).

### 4. What does RecoverOS do?
It is a contextual revenue-recovery control system. It detects revenue at risk via webhook ingestion, uses AI to diagnose the root cause, routes that decision through a strict deterministic policy firewall, and executes the optimal recovery action (e.g., Smart Retry vs. Card Update Prompt).

### 5. Where is AI actually useful?
Gemini analyzes unstructured multi-dimensional telemetry (error codes, customer tenure, issuer CBS health) to correctly classify the failure category and suggest a recovery tactic.

### 6. Why is deterministic policy necessary?
AI systems hallucinate. A deterministic policy mathematically guarantees that the AI cannot authorize unsupported actions, exceed intervention budgets, bypass fraud rules, or spam customers.

### 7. How is money protected?
The AI has zero execution authority. Every action is gated by the Policy Engine, and the execution layer is housed in a secure Node.js/Express server that explicitly refuses to boot with `rzp_live_` credentials. Execution is strictly sandboxed.

### 8. How are duplicate executions prevented?
The webhook ingestion engine utilizes an `Idempotency-Key` mechanism backed by a durable SQLite database. If an identical event or action is received, the server rejects it as a duplicate replay, even across process restarts.

### 9. How is webhook authenticity verified?
Using `crypto.createHmac('sha256')`, the system explicitly verifies the `x-razorpay-signature` against the payload and the webhook secret before processing anything.

### 10. How are retries bounded?
The Policy Engine strictly enforces `maxRetriesPerIncident` (e.g., 3) and `minCooldownMinutes` (e.g., 120), rejecting any AI suggestions that violate these limits.

### 11. How does escalation work?
If a failure is `UNKNOWN_ANOMALY` or the retry budget is exhausted, the system safely aborts automated recovery and logs the action as `ESCALATE_FOR_REVIEW` or `ESCALATE_HUMAN_OPS` for manual intervention.

### 12. How much revenue was recovered?
The synthetic evaluation reports approximately 77.48% recovery for RecoverOS versus approximately 3.7% for its simulated static-dunning baseline. These are benchmark outputs, not live merchant recovery results.

### 13. How was it measured?
It was measured dynamically by calculating the total `amountInr` of successfully recovered synthetic and held-out test-mode cases, minus the configured intervention costs (e.g., ₹0.85 for WhatsApp nudges).

### 14. Was the data held out?
Yes. 30% of the realistic engineered corpus was strictly held out to evaluate AI and fallback metrics without allowing the deterministic policy to overfit the training data.

### 15. What happens under failure?
The system fails safely. If Gemini times out (503), the system gracefully routes the telemetry to the Deterministic Fallback Classifier, yielding nearly identical secure recovery logic.

### 16. What happens when AI is wrong?
If Gemini recommends an invalid action (e.g., `TRANSFER_FUNDS`), the Policy Engine's Action Whitelist intercepts it and throws an exception, aborting the process before the gateway is ever touched.

### 17. What happens when the gateway fails?
The execution logic catches the exception, avoids mutating the final Ledger state incorrectly, and queues the payment for a safe retry once network connectivity resumes.

### 18. What is simulated?
The actual movement of live funds is mocked in memory to comply with hackathon safety rules and prevent real financial consequences.

### 19. What uses Razorpay Test Mode?
The executable demo uses locally generated, signed Razorpay-shaped test events and an in-memory sandbox. It does not claim a live Razorpay Test Mode transaction. A production integration would need a server-side webhook endpoint, real test credentials, and independently recorded integration evidence.

### 20. What would be required for production?
Production deployment requires a server-side webhook endpoint with a durable idempotency store, a secure secret manager, independently verified Razorpay Test Mode integration, reconciliation against payment status, customer consent/channel controls, monitoring, and a formal production-risk review. This prototype deliberately has none of those live connections enabled.
