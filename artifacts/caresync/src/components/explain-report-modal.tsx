import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Info,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { ModalTransition, FadeIn } from '@/components/motion';

interface ParameterExplanation {
  parameter: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW';
  plainMeaning: string;
}

interface ExplainReportModalProps {
  isOpen: boolean;
  testName?: string;
  summary?: string;
  onClose: () => void;
}

const DEFAULT_EXPLANATIONS: ParameterExplanation[] = [
  {
    parameter: 'HbA1c (Glycated Hemoglobin)',
    value: '6.6',
    unit: '%',
    referenceRange: '4.0 - 5.6',
    flag: 'HIGH',
    plainMeaning:
      'HbA1c reflects your average blood sugar levels over the past 2 to 3 months. Values between 5.7% and 6.4% indicate pre-diabetes range, and 6.5% or above indicates pre-diabetes / diabetic trend.',
  },
  {
    parameter: 'Fasting Blood Glucose',
    value: '114',
    unit: 'mg/dL',
    referenceRange: '70 - 99',
    flag: 'HIGH',
    plainMeaning:
      'Measures blood sugar concentration after an overnight fast. Normal fasting glucose is under 100 mg/dL. 100–125 mg/dL indicates impaired fasting glucose.',
  },
  {
    parameter: 'Total Cholesterol',
    value: '215',
    unit: 'mg/dL',
    referenceRange: '< 200',
    flag: 'HIGH',
    plainMeaning:
      'Total blood cholesterol level. Values over 200 mg/dL are elevated and recommended for clinical lipid management with diet and physical activity.',
  },
  {
    parameter: 'Serum Creatinine',
    value: '0.90',
    unit: 'mg/dL',
    referenceRange: '0.70 - 1.20',
    flag: 'NORMAL',
    plainMeaning:
      'Serum creatinine is a natural byproduct filtered by the kidneys. Your level is well within normal limits, reflecting healthy renal filtration.',
  },
];

export function ExplainReportModal({
  isOpen,
  testName = 'HbA1c & Fasting Lipid Panel',
  summary = 'Pre-diabetes range confirmed per NABL biological reference intervals.',
  onClose,
}: ExplainReportModalProps) {
  return (
    <ModalTransition isOpen={isOpen} onClose={onClose}>
      <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent)/.15)] text-[hsl(var(--accent))]">
            <Sparkles size={20} />
          </div>
          <div>
            <div className="eyebrow text-[hsl(var(--accent-foreground))]">CareSync AI Medical Assistant</div>
            <h2 className="font-display mt-0.5 text-2xl font-bold">Report Explanation: {testName}</h2>
          </div>
        </div>
        <button className="btn-ghost" onClick={onClose} data-testid="button-close-explain-modal">
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {/* Verified Summary Banner */}
        <div className="rounded-2xl bg-[hsl(var(--secondary))] p-4 text-xs">
          <div className="font-bold text-[hsl(var(--primary))] flex items-center gap-1.5">
            <Info size={14} /> Diagnostic Findings Summary
          </div>
          <p className="mt-1 leading-relaxed text-[hsl(var(--foreground))]">{summary}</p>
        </div>

        {/* Parameter-by-Parameter Breakdown */}
        <div>
          <div className="eyebrow">Parameter Analysis & Reference Ranges</div>
          <div className="mt-3 space-y-3">
            {DEFAULT_EXPLANATIONS.map((param) => (
              <div key={param.parameter} className="rounded-2xl border border-[hsl(var(--border))] p-4 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{param.parameter}</span>
                  <span
                    className={`status-pill ${
                      param.flag === 'HIGH' ? 'status-amber' : param.flag === 'NORMAL' ? 'status-green' : 'status-coral'
                    }`}
                  >
                    {param.flag === 'HIGH' ? 'Elevated' : 'Normal'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[.68rem] text-[hsl(var(--muted-foreground))]">
                  <span>
                    Your Value: <strong className="text-[hsl(var(--foreground))]">{param.value} {param.unit}</strong>
                  </span>
                  <span>
                    Standard Reference: <strong className="text-[hsl(var(--foreground))]">{param.referenceRange} {param.unit}</strong>
                  </span>
                </div>
                <p className="leading-relaxed text-[hsl(var(--foreground)/.85)] pt-1 border-t border-[hsl(var(--border))]">
                  {param.plainMeaning}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Medical Disclaimer Box */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-2.5">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="leading-relaxed">
            <span className="font-bold">Medical Safety Note: </span>
            CareSync AI provides software-assisted healthcare information management and does not replace professional medical diagnosis, treatment, or clinical directives. Always discuss results with your consulting physician.
          </div>
        </div>

        {/* Source Records Button */}
        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
          <button
            onClick={onClose}
            className="btn-secondary text-xs"
            data-testid="button-view-raw-report"
          >
            <ExternalLink size={13} /> View Raw Diagnostic PDF
          </button>
          <button
            onClick={onClose}
            className="btn-primary text-xs"
            data-testid="button-done-explain-modal"
          >
            Understood
          </button>
        </div>
      </div>
    </ModalTransition>
  );
}
