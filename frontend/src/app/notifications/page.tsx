'use client';

import React, { useState } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  RefreshCw,
  Radio,
} from 'lucide-react';

export default function NotificationsPage() {
  const {
    notifications,
    markAllNotificationsRead,
    clearNotifications,
  } = useSocket();

  const [filter, setFilter] = useState<'ALL' | 'LOW_STOCK' | 'REORDER_STATUS'>('ALL');

  const filteredNotifications = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
            <Bell className="w-4 h-4 text-black" />
            <span>SOCKET.IO TELEMETRY</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-black uppercase">
            Live Event Stream
          </h1>
          <p className="text-xs text-zinc-600 mt-1">
            Real-time telemetry of low-stock detections and automated reorder state transitions via Socket.IO.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={markAllNotificationsRead}
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-800 hover:text-black rounded-lg border border-zinc-300 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-40 shadow-sm"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
          <button
            onClick={clearNotifications}
            disabled={notifications.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-zinc-100 text-zinc-500 hover:text-black rounded-lg border border-zinc-200 text-xs font-mono uppercase tracking-wider transition-colors disabled:opacity-40 shadow-sm"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear stream</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {(['ALL', 'LOW_STOCK', 'REORDER_STATUS'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${
              filter === tab
                ? 'bg-black text-white font-bold shadow-sm'
                : 'bg-white text-zinc-600 hover:text-black border border-zinc-200 hover:bg-zinc-100'
            }`}
          >
            {tab === 'ALL'
              ? `All Events (${notifications.length})`
              : tab === 'LOW_STOCK'
              ? 'Low Stock Alerts'
              : 'Reorder Status Updates'}
          </button>
        ))}
      </div>

      {/* Live Feed Container */}
      <div className="space-y-3">
        {filteredNotifications.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-16 text-center text-zinc-500 shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3">
              <Radio className="w-8 h-8 text-black animate-pulse" />
              <p className="text-base font-bold text-black font-mono">LISTENING FOR LIVE EVENTS...</p>
              <p className="text-xs text-zinc-500 max-w-sm">
                Whenever inventory changes drop below thresholds or the BullMQ worker updates reorders, events will stream into this feed with zero page reloads.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => {
            const isLowStock = item.type === 'LOW_STOCK';
            return (
              <div
                key={item.id}
                className={`p-4 rounded-xl border transition-all duration-200 flex items-start gap-4 ${
                  item.read
                    ? 'bg-white border-zinc-200 opacity-75'
                    : 'bg-white border-black shadow-sm ring-1 ring-black/5'
                }`}
              >
                <div
                  className="p-2.5 rounded-lg shrink-0 mt-0.5 bg-zinc-100 text-black border border-zinc-300"
                >
                  {isLowStock ? (
                    <AlertTriangle className="w-5 h-5 text-black" />
                  ) : (
                    <RefreshCw className="w-5 h-5 text-black" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-black tracking-tight">
                      {item.title}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-600 mt-1 leading-relaxed break-words">
                    {item.message}
                  </p>

                  {item.meta && (
                    <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono">
                      {Boolean(item.meta.sku) && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-300 text-black font-semibold">
                          SKU: {String(item.meta.sku)}
                        </span>
                      )}
                      {Boolean(item.meta.status) && (
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-300 text-zinc-800">
                          Status: {String(item.meta.status)}
                        </span>
                      )}
                      {item.meta.totalValue !== undefined && (
                        <span className="px-2 py-0.5 rounded-md bg-black text-white font-bold">
                          Total: ${Number(item.meta.totalValue).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
