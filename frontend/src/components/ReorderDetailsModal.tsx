'use client';

import React from 'react';
import { Reorder } from '../lib/types';
import { X, FileText, CheckCircle2, Clock, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';

interface ReorderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reorder: Reorder | null;
  onOpenApproveModal?: (reorder: Reorder) => void;
}

export const ReorderDetailsModal: React.FC<ReorderDetailsModalProps> = ({
  isOpen,
  onClose,
  reorder,
  onOpenApproveModal,
}) => {
  if (!isOpen || !reorder) return null;

  const getStatusBadge = (status: Reorder['status']) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-black text-white border border-black shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            PENDING APPROVAL
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 text-black border border-zinc-300">
            <Clock className="w-3.5 h-3.5" />
            QUEUED IN BULLMQ
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-bold bg-zinc-200 text-black border border-zinc-400 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            PROCESSING (SUPPLIER API)
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-50 text-black border border-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono font-medium bg-zinc-50 text-zinc-400 border border-zinc-200 line-through">
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            FAILED
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-zinc-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-zinc-100 text-black border border-zinc-300">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Reorder Audit Log</h3>
              <p className="text-xs text-zinc-500 font-mono">ID: {reorder.id}</p>
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
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Status Bar */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-50 rounded-lg border border-zinc-200">
            <span className="text-xs font-mono text-zinc-600">Current Status:</span>
            {getStatusBadge(reorder.status)}
          </div>

          {/* Product & Supplier Details */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700">
              Item Specifications
            </h4>
            <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Product Name:</span>
                <span className="text-black font-semibold">{reorder.product?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">SKU:</span>
                <span className="text-black font-mono font-semibold">{reorder.product?.sku || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Target Supplier:</span>
                <span className="text-black font-semibold">{reorder.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">Quantity Ordered:</span>
                <span className="text-black font-mono font-bold">{reorder.quantityOrdered} units</span>
              </div>
              <div className="flex justify-between border-t border-zinc-200 pt-2">
                <span className="text-zinc-600">Total Purchase Value:</span>
                <span className="text-black font-mono font-bold text-sm">
                  ${Number(reorder.totalValue).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Processing / Failure details */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700">
              Execution Lifecycle
            </h4>
            <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-600">Worker Retry Attempts:</span>
                <span className="text-black font-mono font-semibold">{reorder.attempts} / 3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-600">OTP Attempts Made:</span>
                <span className="text-black font-mono font-semibold">{reorder.otpAttempts} / 5</span>
              </div>
              {reorder.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-600">Approved At:</span>
                  <span className="text-black font-mono font-semibold">
                    {new Date(reorder.approvedAt).toLocaleString()}
                  </span>
                </div>
              )}
              {reorder.failureReason && (
                <div className="p-2.5 rounded-lg bg-zinc-100 border border-zinc-400 text-black space-y-1">
                  <div className="flex items-center gap-1.5 font-bold font-mono">
                    <AlertTriangle className="w-3.5 h-3.5 text-black" />
                    <span>Failure Reason:</span>
                  </div>
                  <p className="font-mono text-[11px] leading-relaxed break-words">
                    {reorder.failureReason}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timestamp Timetable */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-zinc-700">
              Timestamps
            </h4>
            <div className="bg-zinc-50 rounded-lg border border-zinc-200 p-4 space-y-2 text-xs text-zinc-600">
              <div className="flex justify-between">
                <span>Created:</span>
                <span className="text-black font-mono">
                  {new Date(reorder.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Updated:</span>
                <span className="text-black font-mono">
                  {new Date(reorder.updatedAt).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-zinc-50 border-t border-zinc-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-zinc-700 hover:text-black bg-white hover:bg-zinc-100 border border-zinc-300 rounded-lg transition-colors shadow-sm"
          >
            Close
          </button>
          {reorder.status === 'PENDING_APPROVAL' && onOpenApproveModal && (
            <button
              onClick={() => {
                onClose();
                onOpenApproveModal(reorder);
              }}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-mono uppercase tracking-wider font-bold text-white bg-black hover:bg-zinc-800 rounded-lg shadow-sm transition-all"
            >
              <span>Authorize Now</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
