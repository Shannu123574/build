/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  AiDiagnosisResult,
  FailureCategory,
  RecoveryAction,
  SyntheticRecoveryCase,
} from '../types.ts';
import { classifyPaymentFailureFallback } from './fallbackClassifier.ts';

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  const apiKey = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }

  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

const diagnosisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    failureCategory: {
      type: Type.STRING,
      enum: [
        'TEMPORARY_ISSUER_OUTAGE',
        'INSUFFICIENT_FUNDS_TRANSIENT',
        'EXPIRED_INSTRUMENT',
        'AUTHENTICATION_ABANDONMENT',
        'FRAUD_SUSPICION_HIGH',
        'GATEWAY_TIMEOUT',
        'UNKNOWN_ANOMALY',
      ],
      description: 'The root cause taxonomy classification for this payment failure.',
    },
    confidenceScore: {
      type: Type.NUMBER,
      description: 'Model confidence score between 0.0 and 1.0.',
    },
    predictedRecoveryProbability: {
      type: Type.NUMBER,
      description: 'Calibrated probability (0.0 - 1.0) of recovering this revenue with the recommended action.',
    },
    suggestedAction: {
      type: Type.STRING,
      enum: [
        'SMART_RETRY_SCHEDULE',
        'FALLBACK_UPI_PAYMENT_LINK',
        'CARD_UPDATE_PROMPT',
        'INTERACTIVE_WHATSAPP_NUDGE',
        'DO_NOT_RETRY_CHURN_RISK',
        'ESCALATE_HUMAN_OPS',
      ],
      description: 'The single most economically and contextually optimal recovery action.',
    },
    recommendedExecutionDelayMinutes: {
      type: Type.INTEGER,
      description: 'Recommended wait time in minutes before triggering the action (e.g. 180 min for bank outages, 15 min for checkout dropoffs).',
    },
    reasoning: {
      type: Type.STRING,
      description: 'Brief, clear professional explanation of the diagnosis and recommendation.',
    },
    riskFactors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'List of observed risk factors (e.g. chargeback risk, fatigue risk, bank downtime).',
    },
  },
  required: [
    'failureCategory',
    'confidenceScore',
    'predictedRecoveryProbability',
    'suggestedAction',
    'recommendedExecutionDelayMinutes',
    'reasoning',
    'riskFactors',
  ],
};

/**
 * Diagnoses a payment failure case using Gemini 2.5 Flash AI reasoning.
 * Falls back to deterministic rule classifier if API key is not present or if the call fails.
 */
export async function diagnosePaymentFailure(
  caseData: SyntheticRecoveryCase
): Promise<AiDiagnosisResult> {
  const ai = getAiClient();

  // If no Gemini API key configured, use deterministic fallback
  if (!ai) {
    return classifyPaymentFailureFallback(caseData);
  }

  const prompt = `
You are the AI Diagnostic Core of RecoverOS AI, an enterprise revenue recovery platform for Razorpay merchants.
Analyze the following payment failure event and provide an economic diagnosis and recovery recommendation.

Payment Incident Details:
- Transaction ID: ${caseData.razorpayPaymentId}
- Order ID: ${caseData.razorpayOrderId}
- Customer Name: ${caseData.customerName}
- Amount: ₹${caseData.amountInr} ${caseData.currency}
- Merchant Category: ${caseData.merchantCategory}
- Payment Method: ${caseData.paymentMethod} ${caseData.cardNetwork ? `(${caseData.cardNetwork})` : ''} ${caseData.issuingBank ? `via ${caseData.issuingBank}` : ''}
- Gateway Error Code: ${caseData.errorCode}
- Gateway Error Description: ${caseData.errorDescription}
- Error Source: ${caseData.errorSource}
- Attempt Number: ${caseData.attemptNumber}
- Consecutive Failure Count: ${caseData.consecutiveFailureCount}
- Customer Tenure: ${caseData.customerTenureMonths} months (${caseData.lifetimeSuccessfulPayments} lifetime successful transactions)
- Issuing Bank Real-time Health Score: ${(((caseData?.bankHealthScore ?? 0)) * 100).toFixed(0)}% (0 = full downtime, 100 = optimal)
- Day of Month: ${caseData.dayOfMonth} (Salary cycle context: 28th-31st is pre-salary low liquidity, 1st-5th is post-salary)
- Hour of Day: ${caseData.hourOfDay}:00

Diagnostic Instructions:
1. Determine root-cause failureCategory among: TEMPORARY_ISSUER_OUTAGE, INSUFFICIENT_FUNDS_TRANSIENT, EXPIRED_INSTRUMENT, AUTHENTICATION_ABANDONMENT, FRAUD_SUSPICION_HIGH, GATEWAY_TIMEOUT, UNKNOWN_ANOMALY.
2. If the error indicates fraud, stolen cards, or extreme velocity, you MUST classify as FRAUD_SUSPICION_HIGH and recommend DO_NOT_RETRY_CHURN_RISK with predictedRecoveryProbability = 0.0.
3. If instrument is expired, retries will never work; recommend CARD_UPDATE_PROMPT.
4. If bank CBS is down, recommend SMART_RETRY_SCHEDULE with appropriate cooldown delay (e.g. 180 min).
5. If checkout drop-off, recommend FALLBACK_UPI_PAYMENT_LINK.
6. If insufficient funds at month-end, recommend INTERACTIVE_WHATSAPP_NUDGE.
7. Return strictly valid JSON adhering to the schema.
`;

  try {
    let timeoutId: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Gemini API call timed out')), 4000);
    });

    const apiCallPromise = ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: 'You are an objective financial recovery intelligence engine. You diagnose payment failures with mathematical precision and zero hallucination.',
        responseMimeType: 'application/json',
        responseSchema: diagnosisResponseSchema,
        temperature: 0.1, // Low temperature for consistent deterministic scoring
      },
    });

    const response = await Promise.race([apiCallPromise, timeoutPromise]);
    clearTimeout(timeoutId!);

    const text = response.text;
    if (!text) {
      return classifyPaymentFailureFallback(caseData);
    }

    const parsed = JSON.parse(text.trim());
    return {
      id: `diag_ai_${Date.now()}_${caseData.id}`,
      caseId: caseData.id,
      failureCategory: parsed.failureCategory as FailureCategory,
      confidenceScore: Math.min(1, Math.max(0, Number(parsed.confidenceScore) || 0.8)),
      predictedRecoveryProbability: Math.min(1, Math.max(0, Number(parsed.predictedRecoveryProbability) || 0.5)),
      suggestedAction: parsed.suggestedAction as RecoveryAction,
      recommendedExecutionDelayMinutes: Math.max(0, Number(parsed.recommendedExecutionDelayMinutes) || 30),
      reasoning: String(parsed.reasoning || 'AI diagnosis complete.'),
      riskFactors: Array.isArray(parsed.riskFactors) ? parsed.riskFactors.map(String) : [],
      isAiFallback: false,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.warn(`[RecoverOS Gemini Client] Error calling Gemini API for case ${caseData.id}. Falling back to rule-based engine:`, err);
    return classifyPaymentFailureFallback(caseData);
  }
}
