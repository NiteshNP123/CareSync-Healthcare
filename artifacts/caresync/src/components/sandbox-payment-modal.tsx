import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CreditCard,
  Download,
  FileText,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  WalletCards,
  X,
} from 'lucide-react';
import { ModalTransition, SuccessAnimation } from '@/components/motion';

interface SandboxPaymentModalProps {
  isOpen: boolean;
  itemTitle: string;
  amount: number;
  paymentType: 'APPOINTMENT' | 'PHARMACY';
  onClose: () => void;
  onPaymentSuccess: (invoiceNumber: string) => void;
}

export function SandboxPaymentModal({
  isOpen,
  itemTitle,
  amount,
  paymentType,
  onClose,
  onPaymentSuccess,
}: SandboxPaymentModalProps) {
  const [state, setState] = useState<'REQUIRED' | 'PROCESSING' | 'SUCCESS' | 'FAILED'>('REQUIRED');
  const [invoiceNumber, setInvoiceNumber] = useState('');

  const subtotal = (amount / 1.12).toFixed(2);
  const tax = (amount - Number(subtotal)).toFixed(2);

  const handlePay = (simulateFailure = false) => {
    setState('PROCESSING');
    setTimeout(() => {
      if (simulateFailure) {
        setState('FAILED');
      } else {
        const inv = `INV-2048-${Math.floor(1000 + Math.random() * 9000)}`;
        setInvoiceNumber(inv);
        setState('SUCCESS');
        onPaymentSuccess(inv);
      }
    }, 700);
  };

  const handleReset = () => {
    setState('REQUIRED');
    onClose();
  };

  return (
    <ModalTransition isOpen={isOpen} onClose={handleReset}>
      <div className="flex items-start justify-between border-b border-[hsl(var(--border))] pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
            <WalletCards size={20} />
          </div>
          <div>
            <div className="eyebrow">CareSync Sandbox Checkout</div>
            <h2 className="font-display mt-0.5 text-2xl font-bold">Payment for {paymentType === 'PHARMACY' ? 'Pharmacy Order' : 'Doctor Consultation'}</h2>
          </div>
        </div>
        <button className="btn-ghost" onClick={handleReset} data-testid="button-close-payment-modal">
          <X size={18} />
        </button>
      </div>

      {state === 'REQUIRED' && (
        <div className="mt-5 space-y-5">
          {/* Itemized bill summary */}
          <div className="rounded-2xl border border-[hsl(var(--border))] p-4 text-xs space-y-2.5">
            <div className="flex justify-between items-center font-bold text-sm">
              <span>{itemTitle}</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
              <span>Base Subtotal</span>
              <span>₹{subtotal}</span>
            </div>
            <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
              <span>Estimated GST (12%)</span>
              <span>₹{tax}</span>
            </div>
            <div className="border-t border-[hsl(var(--border))] pt-2 flex justify-between font-bold text-base text-[hsl(var(--foreground))]">
              <span>Total Payable</span>
              <span>₹{amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-[hsl(var(--secondary))] p-3.5 text-xs text-[hsl(var(--muted-foreground))] flex items-center gap-2">
            <ShieldCheck size={16} className="text-[hsl(var(--primary))]" />
            <span>Sandbox Mode Active: Real financial cards or bank credentials are never stored.</span>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-[hsl(var(--border))]">
            <button
              className="btn-ghost text-xs text-[hsl(var(--destructive))]"
              onClick={() => handlePay(true)}
              data-testid="button-simulate-payment-failure"
            >
              Simulate Failure
            </button>
            <button
              className="btn-primary"
              onClick={() => handlePay(false)}
              data-testid="button-confirm-sandbox-payment"
            >
              Authorize Sandbox Payment <Check size={15} />
            </button>
          </div>
        </div>
      )}

      {state === 'PROCESSING' && (
        <div className="my-10 text-center space-y-3">
          <RefreshCw size={28} className="mx-auto animate-spin text-[hsl(var(--primary))]" />
          <div className="font-display text-xl font-bold">Processing Sandbox Transaction…</div>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">Verifying state transition and generating invoice receipt.</p>
        </div>
      )}

      {state === 'SUCCESS' && (
        <div className="my-6 text-center space-y-4">
          <SuccessAnimation
            size={52}
            title="Payment Confirmed"
            subtitle={`Receipt ${invoiceNumber} generated and connected to your CareSync records.`}
          />
          <div className="mx-auto max-w-sm rounded-xl border border-[hsl(var(--border))] bg-white p-4 text-left text-xs space-y-1.5">
            <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
              <span>Invoice Ref:</span>
              <strong className="text-[hsl(var(--foreground))] font-mono-care">{invoiceNumber}</strong>
            </div>
            <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
              <span>Total Paid:</span>
              <strong className="text-[hsl(var(--foreground))]">₹{amount.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between text-[hsl(var(--muted-foreground))]">
              <span>Status:</span>
              <strong className="text-emerald-700 font-bold">PAID (CONFIRMED)</strong>
            </div>
          </div>
          <button className="btn-primary" onClick={handleReset} data-testid="button-finish-payment">
            Done
          </button>
        </div>
      )}

      {state === 'FAILED' && (
        <div className="my-6 text-center space-y-4">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-red-100 text-red-700">
            <AlertCircle size={24} />
          </div>
          <h3 className="font-display text-2xl font-bold text-red-900">Payment Rejected</h3>
          <p className="text-xs text-red-700 max-w-sm mx-auto">
            The sandbox payment was declined. Your order remains in PAYMENT_PENDING status. Please retry.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button className="btn-secondary text-xs" onClick={handleReset}>
              Cancel
            </button>
            <button className="btn-primary text-xs" onClick={() => handlePay(false)}>
              Retry Payment
            </button>
          </div>
        </div>
      )}
    </ModalTransition>
  );
}
