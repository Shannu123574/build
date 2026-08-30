/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FailureCategory, PaymentMethodType, RecoveryAction } from '../types.ts';

export function formatINR(amount?: number | null): string {
  const safeAmount = (amount != null && !isNaN(Number(amount))) ? Number(amount) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export function formatINRDecimals(amount?: number | null): string {
  const safeAmount = (amount != null && !isNaN(Number(amount))) ? Number(amount) : 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);
}

export function formatPercent(value?: number | null): string {
  const safeValue = (value != null && !isNaN(Number(value))) ? Number(value) : 0;
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
}

export function formatPercentRaw(value?: number | null): string {
  const safeValue = (value != null && !isNaN(Number(value))) ? Number(value) : 0;
  return `${safeValue.toFixed(2)}%`;
}

export function formatFixed(value?: number | null, digits: number = 2): string {
  const safeValue = (value != null && !isNaN(Number(value))) ? Number(value) : 0;
  return safeValue.toFixed(digits);
}

export const CATEGORY_META: Record<
  FailureCategory,
  {
    label: string;
    description: string;
    recommendedAction: RecoveryAction;
    color: string;
    bgLight: string;
    borderLight: string;
    badgeBg: string;
    badgeText: string;
  }
> = {
  TEMPORARY_ISSUER_OUTAGE: {
    label: 'Temporary Issuer Outage',
    description: 'Bank CBS core banking outage or network failure at issuer',
    recommendedAction: 'SMART_RETRY_SCHEDULE',
    color: '#0284c7', // sky-600
    bgLight: 'bg-sky-50 dark:bg-sky-950/30',
    borderLight: 'border-sky-200 dark:border-sky-800',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
    badgeText: 'text-sky-700 dark:text-sky-300',
  },
  INSUFFICIENT_FUNDS_TRANSIENT: {
    label: 'Insufficient Funds (Transient)',
    description: 'Low balance during mid-month liquidity dip prior to salary cycle',
    recommendedAction: 'INTERACTIVE_WHATSAPP_NUDGE',
    color: '#d97706', // amber-600
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderLight: 'border-amber-200 dark:border-amber-800',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  EXPIRED_INSTRUMENT: {
    label: 'Expired Instrument',
    description: 'Debit/Credit card past expiration date; mandate renewal required',
    recommendedAction: 'CARD_UPDATE_PROMPT',
    color: '#ea580c', // orange-600
    bgLight: 'bg-orange-50 dark:bg-orange-950/30',
    borderLight: 'border-orange-200 dark:border-orange-800',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  AUTHENTICATION_ABANDONMENT: {
    label: 'Authentication Abandonment',
    description: 'User dropped off during 3D-Secure OTP or bank redirection stage',
    recommendedAction: 'FALLBACK_UPI_PAYMENT_LINK',
    color: '#7c3aed', // violet-600
    bgLight: 'bg-violet-50 dark:bg-violet-950/30',
    borderLight: 'border-violet-200 dark:border-violet-800',
    badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-300',
    badgeText: 'text-violet-700 dark:text-violet-300',
  },
  FRAUD_SUSPICION_HIGH: {
    label: 'High Fraud Suspicion',
    description: 'Restricted card, velocity surge, or stolen instrument signature',
    recommendedAction: 'DO_NOT_RETRY_CHURN_RISK',
    color: '#dc2626', // red-600
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderLight: 'border-rose-200 dark:border-rose-800',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  GATEWAY_TIMEOUT: {
    label: 'Gateway Timeout',
    description: 'Razorpay / Acquirer upstream socket reset or response timeout',
    recommendedAction: 'SMART_RETRY_SCHEDULE',
    color: '#0d9488', // teal-600
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    borderLight: 'border-teal-200 dark:border-teal-800',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
  UNKNOWN_ANOMALY: {
    label: 'Unknown Anomaly',
    description: 'Uncategorized payment exception requiring human operations triage',
    recommendedAction: 'ESCALATE_HUMAN_OPS',
    color: '#64748b', // slate-500
    bgLight: 'bg-slate-50 dark:bg-slate-900/40',
    borderLight: 'border-slate-200 dark:border-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
  INVALID_CARD_DETAILS: {
    label: 'Invalid Card Details',
    description: 'Card details entered are incorrect or incomplete',
    recommendedAction: 'CUSTOMER_NOTIFICATION',
    color: '#ea580c',
    bgLight: 'bg-orange-50 dark:bg-orange-950/30',
    borderLight: 'border-orange-200 dark:border-orange-800',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-300',
    badgeText: 'text-orange-700 dark:text-orange-300',
  },
  NETWORK_TIMEOUT: {
    label: 'Network Timeout',
    description: 'General network connectivity issue',
    recommendedAction: 'ALTERNATIVE_PAYMENT_METHOD',
    color: '#0d9488',
    bgLight: 'bg-teal-50 dark:bg-teal-950/30',
    borderLight: 'border-teal-200 dark:border-teal-800',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300',
    badgeText: 'text-teal-700 dark:text-teal-300',
  },
  MANDATE_FAILURE: {
    label: 'Mandate Failure',
    description: 'E-Mandate execution failed',
    recommendedAction: 'MANDATE_REAUTH',
    color: '#d97706',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    borderLight: 'border-amber-200 dark:border-amber-800',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    badgeText: 'text-amber-700 dark:text-amber-300',
  },
  UPI_AUTOPAY_FAILURE: {
    label: 'UPI AutoPay Failure',
    description: 'UPI mandate execution failed',
    recommendedAction: 'MANDATE_REAUTH',
    color: '#0284c7',
    bgLight: 'bg-sky-50 dark:bg-sky-950/30',
    borderLight: 'border-sky-200 dark:border-sky-800',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300',
    badgeText: 'text-sky-700 dark:text-sky-300',
  },
  EXCESSIVE_RETRY_VELOCITY: {
    label: 'Excessive Retry Velocity',
    description: 'Too many retry attempts in a short timeframe',
    recommendedAction: 'ESCALATE_FOR_REVIEW',
    color: '#dc2626',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderLight: 'border-rose-200 dark:border-rose-800',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
  DUPLICATE_WEBHOOK: {
    label: 'Duplicate Webhook',
    description: 'Duplicate event received',
    recommendedAction: 'DO_NOT_RETRY_CHURN_RISK',
    color: '#64748b',
    bgLight: 'bg-slate-50 dark:bg-slate-900/40',
    borderLight: 'border-slate-200 dark:border-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
    badgeText: 'text-slate-700 dark:text-slate-300',
  },
  FORGED_WEBHOOK: {
    label: 'Forged Webhook',
    description: 'Webhook signature verification failed',
    recommendedAction: 'DO_NOT_RETRY_FRAUD',
    color: '#dc2626',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    borderLight: 'border-rose-200 dark:border-rose-800',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    badgeText: 'text-rose-700 dark:text-rose-300',
  },
};

export const ACTION_META: Record<
  RecoveryAction,
  {
    label: string;
    description: string;
    badgeClass: string;
  }
> = {
  SMART_RETRY_SCHEDULE: {
    label: 'Smart Retry Schedule',
    description: 'Health-timed automated token charge',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  FALLBACK_UPI_PAYMENT_LINK: {
    label: 'Fallback UPI Link',
    description: '1-click dynamic Razorpay payment URL',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  CARD_UPDATE_PROMPT: {
    label: 'Card Update Prompt',
    description: 'Self-serve mandate token refresh session',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  INTERACTIVE_WHATSAPP_NUDGE: {
    label: 'Interactive WhatsApp Nudge',
    description: 'Salary-aware interactive WhatsApp 1-tap quick pay',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  DO_NOT_RETRY_CHURN_RISK: {
    label: 'Do Not Retry (Terminal)',
    description: 'Strict policy block to eliminate fraud loss and spam',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
  ESCALATE_HUMAN_OPS: {
    label: 'Escalate to Ops',
    description: 'Human review required for edge case',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
  },
  ALTERNATIVE_PAYMENT_METHOD: {
    label: 'Alternative Payment Method',
    description: 'Prompt user for alternative payment options',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  CUSTOMER_NOTIFICATION: {
    label: 'Customer Notification',
    description: 'Send informational update to customer',
    badgeClass: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  },
  MANDATE_REAUTH: {
    label: 'Mandate Re-Authentication',
    description: 'Trigger e-mandate re-authorization flow',
    badgeClass: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-800',
  },
  DO_NOT_RETRY_FRAUD: {
    label: 'Do Not Retry (Fraud)',
    description: 'Permanent block due to fraud detection',
    badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
  },
  ESCALATE_FOR_REVIEW: {
    label: 'Escalate for Review',
    description: 'Flagged for internal compliance or risk review',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800',
  }
};

export const METHOD_LABELS: Record<PaymentMethodType, string> = {
  card: 'Credit/Debit Card',
  upi: 'UPI / QR',
  mandate: 'e-NACH Mandate',
  netbanking: 'Net Banking',
  wallet: 'Prepaid Wallet',
};
