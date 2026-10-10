'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Product, Reorder } from '../lib/types';
import { api, ApiError } from '../lib/api';
import { useSocket } from '../context/SocketContext';
import { ProductModal } from '../components/ProductModal';
import { StockUpdateModal } from '../components/StockUpdateModal';
import { OtpApprovalModal } from '../components/OtpApprovalModal';
import { ReorderDetailsModal } from '../components/ReorderDetailsModal';
import {
  LayoutDashboard,
  Boxes,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Layers,
  KeyRound,
  Eye,
  ArrowRight,
  DollarSign,
  Radio,
  Clock,
  ShieldCheck,
  PackageCheck,
} from 'lucide-react';

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [reorders, setReorders] = useState<Reorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForStock, setProductForStock] = useState<Product | null>(null);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedReorderForApproval, setSelectedReorderForApproval] = useState<Reorder | null>(null);
  const [selectedReorderForDetails, setSelectedReorderForDetails] = useState<Reorder | null>(null);

  const { onLowStock, onReorderUpdated, notifications, status } = useSocket();

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [productsData, reordersRes] = await Promise.all([
        api.getProducts(),
        api.getReorders({ limit: 50 }),
      ]);
      setProducts(productsData);
      setReorders(reordersRes.data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch dashboard metrics.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Real-time synchronization
  useEffect(() => {
    const unsubLowStock = onLowStock((event) => {
      setProducts((prev) =>
        prev.map((p) =>
          p.id === event.id
            ? { ...p, quantity: event.quantity, lowStockThreshold: event.lowStockThreshold }
            : p
        )
      );
    });

    const unsubReorder = onReorderUpdated(() => {
      fetchDashboardData();
    });

    return () => {
      unsubLowStock();
      unsubReorder();
    };
  }, [onLowStock, onReorderUpdated, fetchDashboardData]);

  // Derived Metrics
  const totalProducts = products.length;
  const lowStockProducts = products.filter(
    (p) => p.quantity < p.lowStockThreshold && p.quantity > 0
  );
  const outOfStockProducts = products.filter((p) => p.quantity === 0);
  const healthyProducts = products.filter(
    (p) => p.quantity >= p.lowStockThreshold
  );

  const totalInventoryValue = products.reduce((acc, p) => {
    const price = Number(p.costPrice) || 0;
    return acc + p.quantity * price;
  }, 0);

  const pendingReorders = reorders.filter(
    (r) => r.status === 'PENDING_APPROVAL'
  );
  const pendingValue = pendingReorders.reduce((acc, r) => {
    return acc + (Number(r.totalValue) || 0);
  }, 0);

  const activeReorders = reorders.filter(
    (r) => r.status === 'QUEUED' || r.status === 'PROCESSING'
  );
  const completedReorders = reorders.filter((r) => r.status === 'COMPLETED');

  const healthPercent = totalProducts
    ? Math.round((healthyProducts.length / totalProducts) * 100)
    : 100;
  const lowPercent = totalProducts
    ? Math.round((lowStockProducts.length / totalProducts) * 100)
    : 0;
  const outPercent = totalProducts
    ? Math.round((outOfStockProducts.length / totalProducts) * 100)
    : 0;

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
            <LayoutDashboard className="w-4 h-4 text-black" />
            <span>OPERATIONAL TELEMETRY</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black uppercase">
            System Dashboard
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Real-time automated stock monitoring, inventory valuation, and pending order authorizations.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-zinc-100 text-zinc-800 hover:text-black rounded-lg border border-zinc-300 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-50 shadow-sm"
            title="Refresh dashboard metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={() => setIsProductModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-300 text-black text-xs font-mono flex items-center justify-between">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-black" />
            <span>ERROR: {error}</span>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="underline font-bold hover:text-zinc-600"
          >
            RETRY
          </button>
        </div>
      )}

      {/* Primary KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Valuation */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Total Stock Valuation
            </span>
            <DollarSign className="w-4 h-4 text-black" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-black tracking-tight">
              ${totalInventoryValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Cumulative value across {totalProducts} catalog products
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>HEALTH: {healthPercent}% OPTIMAL</span>
            <span className="text-black font-bold">ACTIVE</span>
          </div>
        </div>

        {/* KPI 2: Total Items & Stock Health */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Catalog Items
            </span>
            <Boxes className="w-4 h-4 text-black" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-black tracking-tight">
              {totalProducts}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {healthyProducts.length} optimal · {lowStockProducts.length} low · {outOfStockProducts.length} depleted
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>ALERTS: {lowStockProducts.length} LOW</span>
            <Link href="/inventory" className="text-black font-bold underline hover:no-underline">
              MANAGE &rarr;
            </Link>
          </div>
        </div>

        {/* KPI 3: Action Required - Pending Reorders */}
        <div className={`p-5 rounded-xl border shadow-sm flex flex-col justify-between transition-all ${
          pendingReorders.length > 0
            ? 'bg-zinc-950 text-white border-black'
            : 'bg-white text-black border-zinc-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
              pendingReorders.length > 0 ? 'text-zinc-300' : 'text-zinc-500'
            }`}>
              Pending OTP Approvals
            </span>
            <ShieldCheck className={`w-4 h-4 ${pendingReorders.length > 0 ? 'text-white' : 'text-black'}`} />
          </div>
          <div className="my-3">
            <div className={`text-3xl font-black font-mono tracking-tight ${
              pendingReorders.length > 0 ? 'text-white' : 'text-black'
            }`}>
              {pendingReorders.length}
            </div>
            <p className={`text-[11px] mt-1 ${
              pendingReorders.length > 0 ? 'text-zinc-300' : 'text-zinc-500'
            }`}>
              ${pendingValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              requiring manager authorization
            </p>
          </div>
          <div className={`pt-2 border-t flex items-center justify-between text-[10px] font-mono ${
            pendingReorders.length > 0 ? 'border-zinc-800 text-zinc-300' : 'border-zinc-100 text-zinc-500'
          }`}>
            <span className={pendingReorders.length > 0 ? 'text-white font-bold' : 'text-zinc-400'}>
              {pendingReorders.length > 0 ? 'ACTION REQUIRED' : 'NO BACKLOG'}
            </span>
            <Link
              href="/reorders"
              className={`underline hover:no-underline font-bold ${
                pendingReorders.length > 0 ? 'text-white' : 'text-black'
              }`}
            >
              QUEUE &rarr;
            </Link>
          </div>
        </div>

        {/* KPI 4: Active Reorder Pipeline */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[11px] font-mono uppercase tracking-wider font-semibold">
              Reorder Pipeline
            </span>
            <RefreshCw className="w-4 h-4 text-black" />
          </div>
          <div className="my-3">
            <div className="text-3xl font-black font-mono text-black tracking-tight">
              {activeReorders.length}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Active background worker jobs ({completedReorders.length} completed total)
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>SOCKET: {status.toUpperCase()}</span>
            <Link href="/reorders" className="text-black font-bold underline hover:no-underline">
              AUDIT &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Stock Health Breakdown Visualization */}
      <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xs font-mono font-bold text-black uppercase tracking-wider">
              Warehouse Stock Health Distribution
            </h2>
            <p className="text-[11px] text-zinc-500">
              Proportion of catalog units across optimal, low-threshold, and stockout states.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-black rounded-sm inline-block"></span>
              <span className="text-zinc-800">Optimal ({healthyProducts.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-zinc-400 rounded-sm inline-block"></span>
              <span className="text-zinc-800">Low Stock ({lowStockProducts.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-zinc-200 rounded-sm inline-block"></span>
              <span className="text-zinc-800">Depleted ({outOfStockProducts.length})</span>
            </div>
          </div>
        </div>

        {/* Monochrome Bar */}
        <div className="h-4 w-full bg-zinc-100 rounded-md overflow-hidden flex border border-zinc-200">
          <div
            style={{ width: `${healthPercent}%` }}
            className="bg-black h-full transition-all duration-500"
            title={`Optimal: ${healthPercent}%`}
          />
          <div
            style={{ width: `${lowPercent}%` }}
            className="bg-zinc-400 h-full transition-all duration-500"
            title={`Low Stock: ${lowPercent}%`}
          />
          <div
            style={{ width: `${outPercent}%` }}
            className="bg-zinc-200 h-full transition-all duration-500"
            title={`Depleted: ${outPercent}%`}
          />
        </div>
      </div>

      {/* Two Column Grid: Pending Approvals & Critical Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: Pending Approvals Queue */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-black" />
              <h2 className="text-xs font-mono font-bold text-black uppercase tracking-wider">
                Pending Approvals ({pendingReorders.length})
              </h2>
            </div>
            <Link
              href="/reorders"
              className="text-[11px] font-mono text-zinc-600 hover:text-black flex items-center gap-1"
            >
              <span>All Reorders</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {pendingReorders.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-200 rounded-xl">
              <PackageCheck className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-zinc-700">
                ALL REORDERS UP TO DATE
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                No orders are currently waiting for manager OTP authorization.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingReorders.slice(0, 5).map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 hover:border-zinc-400 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-black tracking-tight truncate">
                      {r.product?.name || 'Inventory Item'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-600 mt-0.5 flex items-center gap-2">
                      <span>SKU: {r.product?.sku || 'SKU'}</span>
                      <span>·</span>
                      <span>QTY: {r.quantityOrdered}</span>
                      <span>·</span>
                      <span className="text-black font-bold">
                        ${Number(r.totalValue).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedReorderForDetails(r)}
                      className="p-1.5 bg-white hover:bg-zinc-100 text-zinc-700 hover:text-black rounded border border-zinc-300 text-xs transition-colors"
                      title="Inspect reorder details"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setSelectedReorderForApproval(r)}
                      className="px-3 py-1.5 bg-black hover:bg-zinc-800 text-white text-xs font-mono font-bold uppercase rounded transition-colors shadow-sm"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Critical Stock Alerts */}
        <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-black" />
              <h2 className="text-xs font-mono font-bold text-black uppercase tracking-wider">
                Critical Stock Alerts ({lowStockProducts.length + outOfStockProducts.length})
              </h2>
            </div>
            <Link
              href="/inventory"
              className="text-[11px] font-mono text-zinc-600 hover:text-black flex items-center gap-1"
            >
              <span>View Inventory</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {lowStockProducts.length === 0 && outOfStockProducts.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-zinc-200 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-zinc-400 mx-auto mb-2" />
              <p className="text-xs font-mono font-bold text-zinc-700">
                INVENTORY FULLY STOCKED
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Every catalog product is currently above minimum replenishment thresholds.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {[...outOfStockProducts, ...lowStockProducts].slice(0, 5).map((p) => {
                const isDepleted = p.quantity === 0;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex items-center justify-between gap-3 hover:border-zinc-400 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-black tracking-tight truncate">
                          {p.name}
                        </span>
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isDepleted
                              ? 'bg-black text-white border-black'
                              : 'bg-zinc-200 text-black border-zinc-300'
                          }`}
                        >
                          {isDepleted ? 'DEPLETED' : 'LOW STOCK'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-zinc-600 mt-0.5 flex items-center gap-2">
                        <span>SKU: {p.sku}</span>
                        <span>·</span>
                        <span>
                          Current: <strong className="text-black">{p.quantity}</strong> / {p.lowStockThreshold}
                        </span>
                        <span>·</span>
                        <span>Supplier: {p.supplierName}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <button
                        onClick={() => {
                          setProductForStock(p);
                          setIsStockModalOpen(true);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-white hover:bg-zinc-100 text-black border border-zinc-300 text-xs font-mono uppercase transition-colors shadow-sm"
                      >
                        <Layers className="w-3 h-3" />
                        <span>Adjust</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Live Telemetry Stream Preview */}
      <div className="p-5 rounded-xl bg-white border border-zinc-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-black" />
            <h2 className="text-xs font-mono font-bold text-black uppercase tracking-wider">
              Live Socket.IO Stream Activity
            </h2>
          </div>
          <Link
            href="/notifications"
            className="text-[11px] font-mono text-zinc-600 hover:text-black flex items-center gap-1"
          >
            <span>Live Feed Page</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {notifications.length === 0 ? (
          <div className="py-6 text-center text-xs font-mono text-zinc-400">
            Awaiting real-time telemetry events. Live listeners active.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {notifications.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 flex flex-col justify-between space-y-2"
              >
                <div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                    <span className="font-bold text-black">{item.type}</span>
                    <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-black mt-1">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2">
                    {item.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        productToEdit={null}
        onSuccess={() => fetchDashboardData()}
      />

      <StockUpdateModal
        isOpen={isStockModalOpen}
        onClose={() => setIsStockModalOpen(false)}
        product={productForStock}
        onSuccess={() => fetchDashboardData()}
      />

      <OtpApprovalModal
        isOpen={Boolean(selectedReorderForApproval)}
        onClose={() => setSelectedReorderForApproval(null)}
        reorder={selectedReorderForApproval}
        onSuccess={() => fetchDashboardData()}
      />

      <ReorderDetailsModal
        isOpen={Boolean(selectedReorderForDetails)}
        onClose={() => setSelectedReorderForDetails(null)}
        reorder={selectedReorderForDetails}
        onOpenApproveModal={(reorder) => {
          setSelectedReorderForApproval(reorder);
        }}
      />
    </div>
  );
}
