import React from 'react';
import {
  Activity,
  Building2,
  CalendarDays,
  Check,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  FlaskConical,
  HeartPulse,
  LockKeyhole,
  MapPin,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react';
import { ModalTransition, StatusTransition, FadeIn } from '@/components/motion';
import type { JourneyEvent } from '@workspace/api-client-react';

interface JourneyModalProps {
  event: JourneyEvent | null;
  onClose: () => void;
  onExplainReport?: (event: JourneyEvent) => void;
}

export function JourneyDetailModal({ event, onClose, onExplainReport }: JourneyModalProps) {
  if (!event) return null;

  const color =
    event.accent === 'coral'
      ? 'hsl(var(--accent))'
      : event.accent === 'gold'
      ? 'hsl(38 75% 50%)'
      : event.accent === 'blue'
      ? 'hsl(198 75% 45%)'
      : 'hsl(var(--primary))';

  const Icon =
    event.type === 'test'
      ? FlaskConical
      : event.type === 'medication'
      ? Pill
      : event.type === 'report'
      ? FileText
      : event.type === 'appointment'
      ? CalendarDays
      : Stethoscope;

  const isLabReport = event.type === 'report' || event.title.toLowerCase().includes('report');
  const isMedication = event.type === 'medication' || event.title.toLowerCase().includes('prescription');

  return (
    <ModalTransition isOpen={Boolean(event)} onClose={onClose}>
      <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-4">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white shadow-sm"
            style={{ backgroundColor: color }}
          >
            <Icon size={20} />
          </div>
          <div>
            <div className="eyebrow">{event.type} Milestone</div>
            <h2 className="font-display mt-0.5 text-2xl font-bold">{event.title}</h2>
          </div>
        </div>
        <button
          className="btn-ghost"
          onClick={onClose}
          aria-label="Close milestone details"
          data-testid="button-close-journey-modal"
        >
          <X size={18} />
        </button>
      </div>

      <div className="mt-5 space-y-5">
        {/* Status & Metadata Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[hsl(var(--secondary))] p-3.5 text-xs">
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Timestamp: </span>
            <span className="font-bold">{event.date}</span>
          </div>
          <div>
            <span className="text-[hsl(var(--muted-foreground))]">Provider: </span>
            <span className="font-bold">{event.provider}</span>
          </div>
          <StatusTransition
            status={event.status}
            variant={event.status === 'completed' ? 'green' : event.status === 'upcoming' ? 'amber' : 'slate'}
          />
        </div>

        {/* Clinical Narrative Summary */}
        <div>
          <div className="eyebrow">Clinical Narrative</div>
          <p className="mt-1.5 text-sm leading-relaxed text-[hsl(var(--foreground))]">
            {event.description}
          </p>
        </div>

        {/* Organization / Facility Credentials */}
        <div className="rounded-2xl border border-[hsl(var(--border))] p-4 text-xs">
          <div className="flex items-center gap-2 font-bold text-[hsl(var(--foreground))]">
            <Building2 size={15} className="text-[hsl(var(--primary))]" />
            <span>{event.organization}</span>
          </div>
          <div className="mt-2 flex items-center gap-4 text-[hsl(var(--muted-foreground))]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[hsl(var(--primary))]" />
              Verified Health Network
            </span>
            <span className="flex items-center gap-1.5">
              <LockKeyhole size={13} className="text-[hsl(var(--primary))]" />
              Encrypted in CareSync Journey
            </span>
          </div>
        </div>

        {/* Lab Report Structured Parameters Preview if applicable */}
        {isLabReport && (
          <div className="rounded-2xl border border-[hsl(198_75%_45%)/.3] bg-[hsl(198_75%_45%)/.05] p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-[hsl(198_75%_35%)]">
                <FileCheck2 size={16} />
                <span>NABL Verified Diagnostic Parameters</span>
              </div>
              {onExplainReport && (
                <button
                  onClick={() => onExplainReport(event)}
                  className="btn-primary text-xs py-1.5 px-3 bg-[hsl(198_75%_45%)] hover:bg-[hsl(198_75%_38%)]"
                  data-testid="button-ai-explain-report-modal"
                >
                  <Sparkles size={13} /> Explain with AI
                </button>
              )}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-white p-2.5 border border-[hsl(var(--border))]">
                <div className="font-bold text-[hsl(var(--muted-foreground))]">HbA1c</div>
                <div className="text-base font-bold text-amber-700">6.6% <span className="text-[.68rem] font-normal text-amber-600">(High)</span></div>
                <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Ref: 4.0 - 5.6%</div>
              </div>
              <div className="rounded-xl bg-white p-2.5 border border-[hsl(var(--border))]">
                <div className="font-bold text-[hsl(var(--muted-foreground))]">Fasting Glucose</div>
                <div className="text-base font-bold text-amber-700">114 mg/dL <span className="text-[.68rem] font-normal text-amber-600">(High)</span></div>
                <div className="text-[.65rem] text-[hsl(var(--muted-foreground))]">Ref: 70 - 99 mg/dL</div>
              </div>
            </div>
          </div>
        )}

        {/* Prescribed Items Preview if applicable */}
        {isMedication && (
          <div className="rounded-2xl border border-[hsl(38_75%_50%)/.3] bg-[hsl(38_75%_50%)/.05] p-4 text-xs">
            <div className="font-bold text-sm text-[hsl(32_75%_32%)] flex items-center gap-2">
              <Pill size={15} /> Active Prescribed Medicines
            </div>
            <div className="mt-2 space-y-1.5">
              <div className="rounded-lg bg-white p-2 border border-[hsl(var(--border))]">
                <div className="font-bold">Metformin Hydrochloride 500mg SR</div>
                <div className="text-[.68rem] text-[hsl(var(--muted-foreground))]">Dosage: 1 tablet daily with dinner · Duration: 30 days</div>
              </div>
            </div>
          </div>
        )}

        {/* Source Record Actions */}
        <div className="flex items-center justify-between border-t border-[hsl(var(--border))] pt-4">
          <div className="text-[.68rem] text-[hsl(var(--muted-foreground))]">
            Connected Record ID: CS-EVT-{event.id}-2026
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="btn-secondary text-xs"
              data-testid="button-view-source-record"
            >
              <ExternalLink size={13} /> View Source Record
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-xs"
              data-testid="button-done-journey-modal"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </ModalTransition>
  );
}
