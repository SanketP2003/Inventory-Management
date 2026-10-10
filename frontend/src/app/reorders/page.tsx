'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Reorder, ReorderStatus } from '../../lib/types';
import { api, ApiError } from '../../lib/api';
import { useSocket } from '../../context/SocketContext';
import { OtpApprovalModal } from '../../components/OtpApprovalModal';
import { ReorderDetailsModal } from '../../components/ReorderDetailsModal';
import {
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  KeyRound,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function ReordersPage() {
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Pagination
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modals
  const [selectedReorderForDetails, setSelectedReorderForDetails] = useState<Reorder | null>(null);
  const [selectedReorderForApproval, setSelectedReorderForApproval] = useState<Reorder | null>(null);

  const { onReorderUpdated } = useSocket();

  const fetchReorders = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 10,
        ...(selectedStatus !== 'ALL' ? { status: selectedStatus as ReorderStatus } : {}),
      };

      const res = await api.getReorders(params);
      setReorders(res.data);
      setTotalPages(res.pagination.totalPages);
      setTotalCount(res.pagination.total);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch reorders.');
      }
    } finally {
      setLoading(false);
    }
  }, [page, selectedStatus]);

  useEffect(() => {
    fetchReorders();
  }, [fetchReorders]);

  // Real-time synchronization: listen for reorder-updated
  useEffect(() => {
    const unsub = onReorderUpdated((updated) => {
      setReorders((prev) => {
        const index = prev.findIndex((r) => r.id === updated.id);
        if (index !== -1) {
          const updatedList = [...prev];
          const current = updatedList[index]!;
          updatedList[index] = {
            ...current,
            status: updated.status,
            attempts: updated.attempts,
            failureReason: updated.failureReason,
            approvedAt: updated.approvedAt,
            updatedAt: updated.updatedAt,
          };
          return updatedList;
        } else {
          if (page === 1) {
            fetchReorders();
          }
          return prev;
        }
      });
    });

    return () => unsub();
  }, [onReorderUpdated, page, fetchReorders]);

  const getStatusBadge = (status: ReorderStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-black text-white border border-black shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            PENDING APPROVAL
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-100 text-black border border-zinc-300">
            <Clock className="w-3.5 h-3.5" />
            QUEUED
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-zinc-200 text-black border border-zinc-400 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            PROCESSING
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-50 text-black border border-zinc-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-black" />
            COMPLETED
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-zinc-50 text-zinc-400 border border-zinc-200">
            <XCircle className="w-3.5 h-3.5 text-zinc-400" />
            FAILED
          </span>
        );
    }
  };

  const statusTabs: { label: string; value: string }[] = [
    { label: 'All', value: 'ALL' },
    { label: 'Pending Approval', value: 'PENDING_APPROVAL' },
    { label: 'Queued', value: 'QUEUED' },
    { label: 'Processing', value: 'PROCESSING' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
            <RefreshCw className="w-4 h-4 text-black" />
            <span>SUPPLY LOGISTICS</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black uppercase">
            Automated Reorder Pipeline
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Track automated supply orders, OTP authorizations, and BullMQ worker job executions in real time.
          </p>
        </div>

        <button
          onClick={() => fetchReorders()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-zinc-100 text-zinc-800 hover:text-black rounded-lg border border-zinc-300 transition-colors shadow-sm self-start sm:self-auto text-xs font-mono uppercase tracking-wider"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="font-bold">Sync Feed</span>
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white border border-zinc-200 rounded-xl shadow-sm">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setSelectedStatus(tab.value);
              setPage(1);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-colors ${
              selectedStatus === tab.value
                ? 'bg-black text-white font-bold shadow-sm'
                : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-300 text-black text-xs font-mono flex items-center justify-between">
          <span>ERROR: {error}</span>
          <button
            onClick={() => fetchReorders()}
            className="underline font-bold hover:text-zinc-600"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Reorders Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-[11px] uppercase font-mono font-bold text-zinc-600 tracking-wider">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Quantity Ordered</th>
                <th className="px-6 py-4">Supplier Name</th>
                <th className="px-6 py-4">Total Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-black" />
                      <p className="text-xs font-mono">FETCHING REORDERS PIPELINE...</p>
                    </div>
                  </td>
                </tr>
              ) : reorders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-zinc-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Clock className="w-8 h-8 text-zinc-400" />
                      <p className="text-sm font-bold text-zinc-700 font-mono">NO REORDERS FOUND</p>
                      <p className="text-xs text-zinc-500">
                        Reorders are automatically generated when stock drops below threshold.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                reorders.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      className="hover:bg-zinc-50/80 transition-colors duration-150"
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-semibold text-black tracking-tight">
                            {r.product?.name || 'Item'}
                          </div>
                          <div className="text-xs font-mono text-zinc-500 mt-0.5">
                            {r.product?.sku || 'SKU'}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono font-semibold text-black">
                        {r.quantityOrdered} units
                      </td>

                      <td className="px-6 py-4 text-zinc-600">
                        {r.supplierName}
                      </td>

                      <td className="px-6 py-4 font-mono font-bold text-black">
                        ${Number(r.totalValue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>

                      <td className="px-6 py-4">
                        {getStatusBadge(r.status)}
                      </td>

                      <td className="px-6 py-4 text-xs font-mono text-zinc-500">
                        {new Date(r.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {r.status === 'PENDING_APPROVAL' && (
                            <button
                              onClick={() => setSelectedReorderForApproval(r)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase shadow-sm transition-all"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedReorderForDetails(r)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 hover:text-black border border-zinc-200 text-xs font-mono uppercase transition-colors"
                            title="View audit trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 text-xs font-mono text-zinc-500">
            <span>
              Showing page <strong className="text-black">{page}</strong> of{' '}
              <strong className="text-black">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-white border border-zinc-200 hover:bg-zinc-100 text-black disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ReorderDetailsModal
        isOpen={Boolean(selectedReorderForDetails)}
        onClose={() => setSelectedReorderForDetails(null)}
        reorder={selectedReorderForDetails}
        onOpenApproveModal={(reorder) => {
          setSelectedReorderForApproval(reorder);
        }}
      />

      <OtpApprovalModal
        isOpen={Boolean(selectedReorderForApproval)}
        onClose={() => setSelectedReorderForApproval(null)}
        reorder={selectedReorderForApproval}
        onSuccess={() => {
          fetchReorders();
        }}
      />
    </div>
  );
}
