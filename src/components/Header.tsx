/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Activity, 
  Zap, 
  Lock, 
  Sparkles, 
  Layers,
  RotateCcw,
  Play,
  HelpCircle,
  BookOpen,
  FileCheck
} from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isRecalculating: boolean;
  onRerun: () => void;
  onResetDemo: () => void;
  ledgerValid: boolean;
  totalRecords: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isRecalculating,
  onRerun,
  onResetDemo,
  ledgerValid,
  totalRecords,
}) => {
  const navItems = [
    { id: 'overview', label: 'Executive Dashboard', icon: Activity },
    { id: 'operations', label: 'Operations Queue', icon: Activity },
    { id: 'proof-center', label: 'Proof Center', icon: ShieldCheck },
    { id: 'track03', label: 'Track 03 Hardening Demo', icon: Play },
    { id: 'story', label: 'Judge Walkthrough', icon: Play },
    { id: 'why-recoveros', label: 'Why RecoverOS?', icon: Sparkles },
    { id: 'safety-lab', label: 'AI Output Sanitization & Policy Defense Lab', icon: Lock },
    { id: 'webhooks', label: 'Webhooks & Gateway', icon: RefreshCw },
    { id: 'demo', label: 'Live Demo Cases', icon: Play },
    { id: 'validation', label: 'Real-World Validation', icon: FileCheck },
    { id: 'comparison', label: 'Baseline vs RecoverOS', icon: Zap },
    { id: 'categories', label: 'Failure Categories', icon: Layers },
    { id: 'pipeline', label: 'Recovery Pipeline', icon: RefreshCw },
    { id: 'ai-decision', label: 'AI Decisions', icon: Sparkles },
    { id: 'policy', label: 'Policy Safety', icon: Lock },
    { id: 'ledger', label: 'Audit Ledger', icon: ShieldCheck },
    { id: 'explorer', label: '100-Case Explorer', icon: Layers },
    { id: 'methodology', label: 'Methodology & Honesty', icon: BookOpen },
  ];


  return (
    <header id="recoveros-header" className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="w-6 h-6 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">RecoverOS<span className="text-emerald-400">.AI</span></span>
                <span className="px-2 py-0.5 text-[10px] uppercase font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                  SANDBOX SIMULATOR
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Autonomous Payment Failure Recovery &amp; Revenue Gating Engine
              </p>
            </div>
          </div>

          {/* Engine Status Indicators & Actions */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="hidden xl:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300">Engine:</span>
              <span className="font-semibold text-emerald-400">Deterministic Seed 42</span>
            </div>

            <div className="hidden md:flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <Lock className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-300">Ledger:</span>
              <span className={`font-semibold ${ledgerValid ? 'text-sky-400' : 'text-rose-400'}`}>
                {ledgerValid ? `SHA-256 Valid (${totalRecords})` : 'Tamper Detected'}
              </span>
            </div>

            {/* Reset Demo Button */}
            <button
              id="header-reset-demo-btn"
              onClick={onResetDemo}
              disabled={isRecalculating}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer active:scale-95 disabled:opacity-50"
              title="Restore initial deterministic seed-42 evaluation state"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Reset Demo</span>
            </button>

            {/* Re-run Benchmark Button */}
            <button
              id="header-rerun-benchmark-btn"
              onClick={onRerun}
              disabled={isRecalculating}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-md active:scale-95 disabled:opacity-50 cursor-pointer ${
                isRecalculating ? 'animate-pulse' : ''
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              <span>{isRecalculating ? 'Evaluating...' : 'Re-run Benchmark'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav id="header-nav-tabs" className="flex space-x-1 overflow-x-auto pb-2 pt-1 no-scrollbar text-xs font-medium border-t border-slate-800/60">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-800 text-emerald-400 font-semibold border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
