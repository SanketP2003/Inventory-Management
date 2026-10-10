'use client';

import React, { useState } from 'react';
import { Reorder } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { ShieldCheck, KeyRound, Loader2, X, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

interface OtpApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  reorder: Reorder | null;
  onSuccess: (updatedReorder: Reorder) => void;
}

export const OtpApprovalModal: React.FC<OtpApprovalModalProps> = ({
  isOpen,
  onClose,
  reorder,
  onSuccess,
}) => {
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState<string | null>(null);

  if (!isOpen || !reorder) return null;

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit numeric OTP code.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setErrorCode(null);
    setResendSuccess(null);

    try {
      const updated = await api.approveReorder(reorder.id, otp);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
        setErrorCode(err.code);
      } else {
        setError('Failed to approve reorder.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    setError(null);
    setErrorCode(null);
    setResendSuccess(null);

    try {
      const res = await api.resendOtp(reorder.id);
      setResendSuccess(
        `New OTP generated! Check server console log. ${
          res.devOtp ? `[Dev code: ${res.devOtp}]` : ''
        }`
      );
      setOtp('');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to resend OTP.');
      }
    } finally {
      setIsResending(false);
    }
  };

  const isLocked = errorCode === 'OTP_LOCKED';
  const isExpired = errorCode === 'OTP_EXPIRED';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black border border-zinc-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">
                Authorize High-Value Reorder
              </h3>
              <p className="text-xs text-zinc-500 font-mono">Two-factor OTP Verification</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-black rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleApprove} className="p-6 space-y-4">
          {/* Order Details Preview */}
          <div className="bg-zinc-50 p-3.5 rounded-lg border border-zinc-200 text-xs space-y-2">
            <div className="flex justify-between text-zinc-600">
              <span>Item / Supplier:</span>
              <span className="text-black font-semibold">
                {reorder.product?.name || 'Item'} ({reorder.supplierName})
              </span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Quantity to Order:</span>
              <span className="text-black font-bold font-mono">{reorder.quantityOrdered} units</span>
            </div>
            <div className="flex justify-between text-zinc-600 border-t border-zinc-200 pt-1.5">
              <span>Total Financial Value:</span>
              <span className="text-black font-mono font-bold text-sm">
                ${Number(reorder.totalValue).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3 text-xs rounded-lg border border-zinc-400 bg-zinc-100 text-black flex items-start gap-2.5 font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-black" />
              <div className="flex-1">
                <p className="font-bold">
                  {isLocked ? 'Approval Locked' : isExpired ? 'OTP Expired' : 'Verification Failed'}
                </p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {resendSuccess && (
            <div className="p-3 text-xs rounded-lg bg-zinc-100 border border-zinc-400 text-black font-mono flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-black" />
              <div>{resendSuccess}</div>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-mono font-semibold text-zinc-700 uppercase tracking-wider text-center">
              Enter 6-Digit Approval OTP
            </label>
            <div className="flex justify-center">
              <input
                type="text"
                maxLength={6}
                disabled={isLocked}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                autoFocus
                className={`w-48 py-3 bg-zinc-50 border rounded-lg text-center text-2xl font-mono tracking-[0.5em] text-black focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-all ${
                  isLocked ? 'opacity-50 cursor-not-allowed border-black' : 'border-zinc-300'
                }`}
              />
            </div>
            <p className="text-[11px] text-zinc-500 text-center font-mono">
              Remaining attempts: {Math.max(0, 3 - (reorder.otpAttempts || 0))}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6 || isLocked}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-black hover:bg-zinc-800 text-white rounded-lg text-xs font-mono uppercase font-bold tracking-wider shadow-sm transition-all disabled:opacity-40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authorize & Dispatch</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isResending || isLocked}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors disabled:opacity-40"
            >
              {isResending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              <span>Regenerate New OTP Code</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
