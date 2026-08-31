import React, { useState } from 'react';
import {
  Check,
  ChevronRight,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from 'lucide-react';
import { ModalTransition, SuccessAnimation } from '@/components/motion';
import type { Doctor } from '@workspace/api-client-react';

interface ShareTransferModalProps {
  isOpen: boolean;
  doctors: Doctor[];
  onClose: () => void;
  onSuccess: (doctorName: string, scopes: string[]) => void;
}

export const DATA_SCOPE_OPTIONS = [
  { id: 'CONSULTATIONS', label: 'Consultations & Assessments', desc: 'Physician observations, diagnoses, and treatment plans' },
  { id: 'LAB_REPORTS', label: 'Laboratory Diagnostic Reports', desc: 'Blood panels, lipid profiles, and metabolic test results' },
  { id: 'PRESCRIPTIONS', label: 'Prescriptions & Active Medications', desc: 'Active medication lists, dosages, and instructions' },
  { id: 'VITALS', label: 'Vitals & Longitudinal Trends', desc: 'Blood pressure, blood glucose, and heart rate history' },
  { id: 'JOURNEY', label: 'Care Journey Timeline', desc: 'Chronological summary of all healthcare handoffs' },
];

export function ShareTransferModal({ isOpen, doctors, onClose, onSuccess }: ShareTransferModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number>(2); // Default to Dr. Ananya Sharma
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    'CONSULTATIONS',
    'LAB_REPORTS',
    'PRESCRIPTIONS',
    'VITALS',
    'JOURNEY',
  ]);
  const [otp, setOtp] = useState('749201');
  const [isProcessing, setIsProcessing] = useState(false);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId) || doctors[1] || doctors[0];

  const handleToggleScope = (scopeId: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scopeId) ? prev.filter((s) => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleConfirmTransfer = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(4);
      onSuccess(selectedDoctor?.name || 'Physician', selectedScopes);
    }, 450);
  };

  const handleReset = () => {
    setStep(1);
    onClose();
  };

  return (
    <ModalTransition isOpen={isOpen} onClose={handleReset}>
      <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-4">
        <div>
          <div className="eyebrow">CareSync Physician Transfer</div>
          <h2 className="font-display mt-0.5 text-2xl font-bold">Share Care Context with a Doctor</h2>
        </div>
        <button className="btn-ghost" onClick={handleReset} data-testid="button-close-share-modal">
          <X size={18} />
        </button>
      </div>

      {step === 1 && (
        <div className="mt-5 space-y-4">
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            Select a specialist or primary care doctor to grant secure, authorized access to your care journey records.
          </p>

          <div className="space-y-2.5">
            {doctors.map((doctor) => (
              <div
                key={doctor.id}
                onClick={() => setSelectedDoctorId(doctor.id)}
                className={`flex items-center justify-between rounded-2xl border p-4 cursor-pointer transition-all ${
                  selectedDoctorId === doctor.id
                    ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.05)] shadow-sm'
                    : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary)/.5)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] font-bold text-[hsl(var(--primary))] text-sm">
                    {doctor.initials || 'DR'}
                  </div>
                  <div>
                    <div className="font-bold text-sm">{doctor.name}</div>
                    <div className="text-xs text-[hsl(var(--muted-foreground))]">{doctor.specialization} · {doctor.organization}</div>
                  </div>
                </div>
                {selectedDoctorId === doctor.id && (
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-[hsl(var(--primary))] text-white text-xs font-bold">
                    <Check size={14} />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4 border-t border-[hsl(var(--border))]">
            <button className="btn-primary" onClick={() => setStep(2)} data-testid="button-share-next-scopes">
              Next: Select Data Scopes <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-5 space-y-4">
          <div className="rounded-xl bg-[hsl(var(--secondary))] p-3 text-xs">
            Sharing with: <span className="font-bold">{selectedDoctor.name}</span> ({selectedDoctor.specialization})
          </div>

          <div className="eyebrow">Select Granular Data Permissions</div>
          <div className="space-y-2">
            {DATA_SCOPE_OPTIONS.map((opt) => {
              const isChecked = selectedScopes.includes(opt.id);
              return (
                <div
                  key={opt.id}
                  onClick={() => handleToggleScope(opt.id)}
                  className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/.04)]'
                      : 'border-[hsl(var(--border))] opacity-75'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleScope(opt.id)}
                    className="mt-0.5 h-4 w-4 rounded accent-[hsl(var(--primary))]"
                  />
                  <div className="text-xs">
                    <div className="font-bold">{opt.label}</div>
                    <div className="text-[.68rem] text-[hsl(var(--muted-foreground))]">{opt.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[hsl(var(--border))]">
            <button className="btn-ghost" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="btn-primary"
              disabled={selectedScopes.length === 0}
              onClick={() => setStep(3)}
              data-testid="button-share-next-otp"
            >
              Next: Authorize via OTP <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[hsl(var(--primary)/.3)] bg-[hsl(var(--primary)/.05)] p-4 text-xs text-[hsl(var(--foreground))]">
            <div className="flex items-center gap-2 font-bold text-sm text-[hsl(var(--primary))]">
              <ShieldCheck size={16} /> Patient-Controlled Authorization
            </div>
            <p className="mt-1.5 leading-relaxed text-[hsl(var(--muted-foreground))]">
              To grant access to <span className="font-bold text-[hsl(var(--foreground))]">{selectedDoctor.name}</span> for {selectedScopes.length} data scopes, enter your CareSync authorization code.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="otp-input">
              6-Digit Authorization Code (Simulated Demo Code: 749201)
            </label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-3 text-[hsl(var(--muted-foreground))]" />
              <input
                id="otp-input"
                className="field pl-10 font-mono-care tracking-widest text-base font-bold"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                data-testid="input-share-otp"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[hsl(var(--border))]">
            <button className="btn-ghost" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="btn-primary"
              disabled={isProcessing || otp.length < 6}
              onClick={handleConfirmTransfer}
              data-testid="button-confirm-share-access"
            >
              {isProcessing ? 'Authorizing…' : 'Grant Authorized Consent'}
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="my-6 text-center space-y-4">
          <SuccessAnimation
            size={52}
            title="Care Records Shared Successfully"
            subtitle={`Dr. ${selectedDoctor.name} now has active authorized access to your selected health scopes.`}
          />
          <div className="mx-auto max-w-sm rounded-xl bg-[hsl(var(--secondary))] p-3 text-left text-xs space-y-1">
            <div className="font-bold text-[hsl(var(--primary))]">Active Scopes:</div>
            {selectedScopes.map((s) => (
              <div key={s} className="text-[.68rem] text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <Check size={12} className="text-[hsl(var(--primary))]" /> {s.replace('_', ' ')}
              </div>
            ))}
          </div>
          <button className="btn-primary mt-4" onClick={handleReset} data-testid="button-finish-share">
            Done
          </button>
        </div>
      )}
    </ModalTransition>
  );
}
